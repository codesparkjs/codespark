import type { Dep } from '_shared/types';
import { parse } from '@babel/parser';
import { availablePresets, transform } from '@babel/standalone';
import { Framework as Base } from '@codespark/framework';
import MagicString from 'magic-string';

import { analyze } from './analyze';

export class Framework extends Base {
  readonly name = 'react';
  readonly imports = {
    react: 'https://esm.sh/react@18.2.0',
    'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime',
    'react-dom/client': 'https://esm.sh/react-dom@18.2.0/client'
  };

  private blobUrlMap = new Map<string, string>();

  analyze(entry: string, files: Record<string, string>) {
    return analyze(entry, files);
  }

  compile(entry: string, files: Record<string, string>) {
    const deps = this.analyze(entry, files);
    const { react, typescript } = availablePresets;

    if (deps.length > 0) this.transformDepsToBlob(deps);
    const sourceWithBlobs = this.transformCodeWithBlobUrls(files[entry]);
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

  revoke(): void {
    for (const url of this.blobUrlMap.values()) {
      URL.revokeObjectURL(url);
    }

    this.blobUrlMap.clear();
  }

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

  private transformCodeWithBlobUrls(code: string) {
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
}

export const react = new Framework();
