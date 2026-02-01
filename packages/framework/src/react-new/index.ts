import { parse } from '@babel/parser';
import { availablePresets } from '@babel/standalone';
import { Framework as Base } from '@codespark/framework';

import { CSSLoader } from '../loaders/css-loader';
import { ESLoader } from '../loaders/es-loader';
import { JSONLoader } from '../loaders/json-loader';
import { type Loader, OutputType } from '../loaders/types';
import type { OutputItem } from '../registry';
import { analyze } from './analyze';
import { compile } from './compile';

export class Framework extends Base {
  readonly name = 'react';
  readonly imports = {
    react: 'https://esm.sh/react@18.2.0',
    'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime',
    'react-dom/client': 'https://esm.sh/react-dom@18.2.0/client'
  };

  private loaders: Loader[] = [];

  constructor() {
    super();
    this.loaders = [
      new ESLoader({
        jsxPreset: [availablePresets.react, { runtime: 'automatic' }],
        isTSX: true
      }),
      new CSSLoader(),
      new JSONLoader()
    ];
  }

  analyze(entry: string, files: Record<string, string>) {
    return analyze(entry, files, this.loaders);
  }

  compile(outputs: Map<OutputType, OutputItem[]>) {
    const transformed = compile(outputs);
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

    builder.async(`
      const { createRoot } = await import('react-dom/client');
      window.__root__ = window.__root__ || createRoot(${builder.root});
      window.__root__.render(${name ? `_jsx(${name}, {})` : 'null'});
    `);

    return builder.toString();
  }
}

export const react = new Framework();
