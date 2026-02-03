import { parse } from '@babel/parser';
import { Framework as Base } from '@codespark/framework';
import MagicString from 'magic-string';

import { type Loader, LoaderType } from '../loaders/types';
import type { Output, Outputs } from '../registry';
import { analyze } from './analyze';

export class Framework extends Base {
  readonly name = 'react';
  readonly imports = {
    react: 'https://esm.sh/react@18.2.0',
    'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime',
    'react-dom/client': 'https://esm.sh/react-dom@18.2.0/client'
  };
  outputs: Outputs = new Map();
  private blobUrlMap = new Map<string, string>();

  constructor(private config?: { loaders?: Loader<any>[] }) {
    super();
  }

  analyze(entry: string, files: Record<string, string>) {
    this.outputs = analyze(entry, files);
  }

  compile() {
    const transformed = this.transformModulesToBlob([...this.getOutput(LoaderType.ESModule)].reverse());
    const builder = this.createBuilder(transformed);
    const ast = parse(transformed, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

    let name: string | undefined;
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
            builder.update(declaration.start!, declaration.body.start! - 1, 'function App() ');
            break;
          case 'FunctionDeclaration':
            if (declaration.async) {
              throw new Error('Export an async function');
            }
            if (declaration.id) {
              name = declaration.id.name;
            } else {
              name = 'App';
              builder.update(declaration.start!, declaration.body.start! - 1, 'function App() ');
            }
            break;
          default:
            throw new Error(`Default export type is invalid: expect a FunctionExpression but got ${declaration.type}`);
        }
      }
    }

    builder.async(`const [{ createRoot }, { jsx }] = await Promise.all([import('react-dom/client'), import('react/jsx-runtime')]);
    window.__root__ = window.__root__ || createRoot(${builder.root});
    window.__root__.render(${name ? `jsx(${name}, {})` : 'null'});`);

    return builder.toString();
  }

  private transformModulesToBlob(modules: Output<LoaderType.ESModule>[]) {
    let entryCode = '';

    modules.forEach((mod, index) => {
      const code = this.transformCodeWithBlobUrls(mod);

      if (index === modules.length - 1) {
        entryCode = code;
      } else {
        const blob = new Blob([code], { type: 'application/javascript' });
        this.blobUrlMap.set(mod.path, URL.createObjectURL(blob));
      }
    });

    return entryCode;
  }

  private transformCodeWithBlobUrls(mod: Output<LoaderType.ESModule>) {
    const s = new MagicString(mod.content);
    const ast = parse(mod.content, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

    for (const node of ast) {
      if (node.type !== 'ImportDeclaration') continue;

      const resolved = mod.dependencies[node.source.value];
      if (!resolved) continue;

      const blobUrl = this.blobUrlMap.get(resolved);
      if (blobUrl) {
        s.update(node.source.start! + 1, node.source.end! - 1, blobUrl);
      } else {
        s.remove(node.start!, node.end!);
      }
    }

    return s.toString();
  }
}

export const react = new Framework();
