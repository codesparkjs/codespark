import { parse } from '@babel/parser';
import { Framework as Base } from '@codespark/framework';
import MagicString from 'magic-string';

import { LoaderType } from '../loaders/types';
import type { Output, Outputs } from '../registry';
import { analyze } from './analyze';

export class Framework extends Base {
  readonly name = 'html';
  readonly imports = {};
  outputs: Outputs = new Map();
  private blobUrlMap = new Map<string, string>();

  analyze(entry: string, files: Record<string, string>) {
    this.outputs = analyze(entry, files);
  }

  compile() {
    const builder = this.createBuilder();

    // 1. Inject CSS first (avoid FOUC)
    const styles = this.getOutput(LoaderType.Style);
    for (const style of styles) {
      builder.append(`
(function() {
  var style = document.createElement('style');
  style.textContent = ${JSON.stringify(style.content)};
  document.head.appendChild(style);
})();
`);
    }

    // 2. Render DOM content
    const assets = this.getOutput(LoaderType.Asset);
    if (assets.length > 0) {
      const htmlContent = assets.map(a => a.content).join('');
      builder.setHTML(JSON.stringify(htmlContent));
    }

    // 3. Execute regular scripts (maintain order)
    const scripts = this.getOutput(LoaderType.Script);
    for (const script of scripts) {
      builder.append(`
;(function() {
  ${script.content}
})();
`);
    }

    // 4. Handle ES Modules
    const modules = this.getOutput(LoaderType.ESModule);
    if (modules.length > 0) {
      const transformed = this.transformModulesToBlob([...modules].reverse());
      if (transformed) {
        builder.append(`
;(async function() {
  ${transformed}
})();
`);
      }
    }

    return builder.done();
  }

  private transformModulesToBlob(modules: Output<LoaderType.ESModule>[]) {
    let entryCode = '';

    modules.forEach((mod, index) => {
      const isEntry = index === modules.length - 1;
      const code = this.transformCodeWithBlobUrls(mod, isEntry);

      if (isEntry) {
        entryCode = code;
      } else {
        const blob = new Blob([code], { type: 'application/javascript' });
        this.blobUrlMap.set(mod.path, URL.createObjectURL(blob));
      }
    });

    return entryCode;
  }

  private transformCodeWithBlobUrls(mod: Output<LoaderType.ESModule>, useDynamicImport = false) {
    const s = new MagicString(mod.content);
    const ast = parse(mod.content, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

    for (const node of ast) {
      if (node.type !== 'ImportDeclaration') continue;

      const resolved = mod.dependencies[node.source.value];
      if (!resolved) continue;

      const blobUrl = this.blobUrlMap.get(resolved);
      if (blobUrl) {
        if (useDynamicImport) {
          // Convert static import to dynamic import() for use inside IIFE
          const dynamicImport = this.staticToDynamicImport(node, blobUrl);
          s.update(node.start!, node.end!, dynamicImport);
        } else {
          s.update(node.source.start! + 1, node.source.end! - 1, blobUrl);
        }
      } else {
        s.remove(node.start!, node.end!);
      }
    }

    return s.toString();
  }

  private staticToDynamicImport(node: import('@babel/types').ImportDeclaration, source: string): string {
    const specifiers = node.specifiers;

    // Side-effect import: import 'module'
    if (specifiers.length === 0) {
      return `await import('${source}');`;
    }

    const parts: string[] = [];
    let defaultName: string | null = null;
    let namespaceName: string | null = null;
    const namedImports: string[] = [];

    for (const spec of specifiers) {
      if (spec.type === 'ImportDefaultSpecifier') {
        defaultName = spec.local.name;
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        namespaceName = spec.local.name;
      } else if (spec.type === 'ImportSpecifier') {
        const imported = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
        if (imported === spec.local.name) {
          namedImports.push(imported);
        } else {
          namedImports.push(`${imported}: ${spec.local.name}`);
        }
      }
    }

    // import * as foo from 'module'
    if (namespaceName) {
      return `const ${namespaceName} = await import('${source}');`;
    }

    // Build destructuring pattern
    if (defaultName) {
      parts.push(`default: ${defaultName}`);
    }
    parts.push(...namedImports);

    return `const { ${parts.join(', ')} } = await import('${source}');`;
  }
}

export const html = new Framework();
