import fs from 'node:fs';
import path from 'node:path';

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { describe, expect, it } from 'vitest';

import { transformJsx } from './transform-jsx';

interface CollectResult {
  entry: { code: string; locals: string[]; imports: string[] };
  files: Record<string, string>;
}

const fixturesDir = path.resolve(__dirname, '__fixtures__');

const evaluate = (node: t.Node): unknown => {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isNullLiteral(node)) return null;
  if (t.isTemplateLiteral(node)) return node.quasis.map(q => q.value.cooked).join('');
  if (t.isArrayExpression(node)) return node.elements.map(el => (el ? evaluate(el) : null));
  if (t.isObjectExpression(node)) {
    const obj: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (t.isObjectProperty(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : t.isStringLiteral(prop.key) ? prop.key.value : null;
        if (key) obj[key] = evaluate(prop.value);
      }
    }
    return obj;
  }
  return undefined;
};

describe('transform JSX', () => {
  const getMatcher = (file: string) => {
    const id = path.resolve(fixturesDir, file);
    const code = fs.readFileSync(id, 'utf-8');
    const result = transformJsx(code, id);
    const ast = parse(result || '', { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    const scannedMap = new Map<string, CollectResult | CollectResult[] | Record<string, CollectResult>>();

    traverse(ast, {
      CallExpression(nodePath) {
        const { callee, arguments: args } = nodePath.node;
        if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.property, { name: 'call' })) return;

        let ctxArg, optionsArg;
        if (args.length === 2) {
          [ctxArg, optionsArg] = args;
        } else {
          [ctxArg, , optionsArg] = args;
        }

        if (!t.isObjectExpression(ctxArg) || !t.isObjectExpression(optionsArg)) return;

        const scannedProp = ctxArg.properties.find((p): p is t.ObjectProperty => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: '__scanned' }));
        const nameProp = optionsArg.properties.find((p): p is t.ObjectProperty => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: 'name' }));
        if (!scannedProp || !nameProp || !t.isStringLiteral(nameProp.value)) return;

        scannedMap.set(nameProp.value.value, evaluate(scannedProp.value) as CollectResult);
      }
    });

    const normalizeResult = (item: CollectResult) => {
      const { entry, files } = item;
      return { entry, files: Object.keys(files).sort() };
    };

    return (
      name: string,
      expected:
        | { entry: { code: string; locals: string[]; imports: string[] }; files: string[] }
        | { entry: { code: string; locals: string[]; imports: string[] }; files: string[] }[]
        | Record<string, { entry: { code: string; locals: string[]; imports: string[] }; files: string[] }>
    ) => {
      const scanned = scannedMap.get(name);
      expect(scanned).toBeDefined();

      let actual: unknown;
      if (Array.isArray(expected)) {
        actual = (scanned as CollectResult[]).map(normalizeResult);
      } else if ('entry' in expected) {
        actual = normalizeResult(scanned as CollectResult);
      } else {
        actual = Object.fromEntries(Object.entries(scanned as Record<string, CollectResult>).map(([k, v]) => [k, normalizeResult(v)]));
      }

      expect(actual).toEqual(expected);
    };
  };

  it('should return null when no transformation needed', () => {
    const code = `const x = 1;`;
    const result = transformJsx(code, '/test.tsx');
    expect(result).toBeNull();
  });

  it('should transform jsx element', () => {
    const match = getMatcher('wrap-element.tsx');

    match('example1.tsx', {
      entry: { code: '<></>', locals: [], imports: [] },
      files: []
    });

    match('example2.tsx', {
      entry: { code: '<div>123</div>', locals: [], imports: [] },
      files: []
    });

    match('example3.tsx', {
      entry: { code: '<Button />', locals: [], imports: [] },
      files: ['./button']
    });

    match('example4.tsx', {
      entry: { code: '<MyButton />', locals: ['const MyButton = () => <button>Click</button>;'], imports: [] },
      files: []
    });

    match('example5.tsx', {
      entry: { code: '<MyButton2 />', locals: ['const MyButton2 = () => <Button />;'], imports: [] },
      files: ['./button']
    });

    match('example6.tsx', {
      entry: { code: '<MyButton3 />', locals: ['const MyButton = () => <button>Click</button>;', 'const MyButton3 = () => <MyButton />;'], imports: [] },
      files: []
    });
  });

  it('should resolve import with explicit extension', () => {
    const match = getMatcher('wrap-with-extension.tsx');

    match('example1.tsx', {
      entry: { code: '<Button />', locals: [], imports: [] },
      files: ['./button.tsx']
    });
  });

  it('should transform react component', () => {
    const match = getMatcher('wrap-component.tsx');

    match('example1.tsx', {
      entry: { code: '() => <button>Click</button>', locals: [], imports: [] },
      files: []
    });

    match('example2.tsx', {
      entry: { code: 'Button', locals: [], imports: [] },
      files: ['./button']
    });

    match('example3.tsx', {
      entry: { code: 'MyButton', locals: ['const MyButton = () => <button>Click</button>;'], imports: [] },
      files: []
    });

    match('example4.tsx', {
      entry: { code: 'MyButton2', locals: ['const MyButton2 = () => <Button />;'], imports: [] },
      files: ['./button']
    });

    match('example5.tsx', {
      entry: { code: 'MyButton3', locals: ['const MyButton = () => <button>Click</button>;', 'const MyButton3 = () => <MyButton />;'], imports: [] },
      files: []
    });

    match('example6.tsx', {
      entry: {
        code: 'function App() {\n    const [count] = useState(0);\n\n    return <button>{count}</button>;\n  }',
        locals: [],
        imports: ["import { useState } from 'react';"]
      },
      files: []
    });
  });
});
