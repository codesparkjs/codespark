import type { Dep } from '_shared/types';
import { parse } from '@babel/parser';
import { availablePresets, transform } from '@babel/standalone';
import MagicString from 'magic-string';

export class ReactCompiler {
  private blobUrlMap = new Map<string, string>();

  private transformDepsToBlob(deps: Dep[]) {
    for (const dep of deps) {
      if (!('code' in dep)) continue;

      if (dep.deps?.length) {
        this.transformDepsToBlob(dep.deps);
      }

      const transformedCode = this.transformCodeWithBlobUrls(dep.code);

      const { react, typescript } = availablePresets;
      const { code: compiledCode } = transform(transformedCode, {
        filename: `${dep.name}.ts`,
        presets: [
          [react, { runtime: 'automatic' }],
          [typescript, { isTSX: true, allExtensions: true }]
        ]
      });

      const blob = new Blob([compiledCode || ''], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      if (dep.alias) {
        this.blobUrlMap.set(dep.alias, blobUrl);
      }
    }
  }

  private transformCodeWithBlobUrls(code: string): string {
    if (this.blobUrlMap.size === 0) {
      return code;
    }

    const s = new MagicString(code);
    const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

    for (const node of ast) {
      if (node.type === 'ImportDeclaration') {
        const importSource = node.source.value;
        const blobUrl = this.blobUrlMap.get(importSource);
        if (blobUrl) {
          s.update(node.source.start! + 1, node.source.end! - 1, blobUrl);
        }
      }
    }

    return s.toString();
  }

  compile(source: string, deps: Dep[] = []) {
    const { react, typescript } = availablePresets;

    if (deps.length > 0) {
      this.transformDepsToBlob(deps);
    }

    const sourceWithBlobs = this.transformCodeWithBlobUrls(source);
    const s = new MagicString(sourceWithBlobs);
    const ast = parse(sourceWithBlobs, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

    let name;
    for (const node of ast) {
      if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration') {
        name = node.declaration?.id?.name;
      } else if (node.type === 'ExportDefaultDeclaration') {
        const declaration = node.declaration;
        switch (declaration.type) {
          case 'Identifier':
            name = declaration.name;

            break;
          case 'ArrowFunctionExpression':
            if (declaration.async) {
              throw new Error('Export an async function');
            }

            name = 'App';
            s.update(declaration.start!, declaration.body.start! - 1, 'function App() ');

            break;
          case 'FunctionDeclaration':
            if (declaration.async) {
              throw new Error('Export an async function');
            }

            if (declaration.id) {
              name = declaration.id.name;
            } else {
              name = 'App';
              s.update(declaration.start!, declaration.body.start! - 1, 'function App() ');
            }

            break;
          default:
            throw new Error(`Default export type is invalid: expect a FunctionExpression but got ${declaration.type}`);
        }
      }
    }

    s.append(
      `
      import('react-dom/client').then(({ createRoot }) => {
        window.__root__ = window.__root__ || createRoot(document.getElementById('root'));
        window.__root__.render(${name ? `<${name} />` : 'null'});
      }).then(() => {
        window.__render_complete__?.();
      }).finally(() => {
        window.__next__?.(); 
      })`
    );
    const { code } = transform(s.toString(), {
      filename: `${name}.ts`,
      presets: [
        [react, { runtime: 'automatic' }],
        [typescript, { isTSX: true, allExtensions: true }]
      ]
    });

    return code || '';
  }

  revokeBlobUrls(): void {
    for (const url of this.blobUrlMap.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlMap.clear();
  }
}
