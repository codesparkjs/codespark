import fs from 'node:fs';
import path from 'node:path';

import _generate from '@babel/generator';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';

import { collectDependencies } from './collect-deps';

// @ts-expect-error @babel/traverse cjs error
const traverse = (_traverse.default ?? _traverse) as typeof _traverse;
// @ts-expect-error @babel/generate cjs error
const generate = (_generate.default ?? _generate) as typeof _generate;

const resolveFile = (source: string, fromFile: string) => {
  const resolved = path.resolve(path.dirname(fromFile), source);
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
  for (const ext of extensions) {
    const tryPath = resolved + ext;
    if (fs.existsSync(tryPath)) return tryPath;
  }
  return fs.existsSync(resolved) ? resolved : null;
};

interface TransformOptions {
  methods?: string[];
}

export const transformJsx = (code: string, id: string, options: TransformOptions = {}) => {
  const { methods = ['createWorkspace'] } = options;
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  const importMap = new Map<string, string>();
  const localNames = new Map<string, string>();
  const slice = (node: t.Node) => code.slice(node.start!, node.end!);
  let modified = false;

  traverse(ast, {
    ImportDeclaration(nodePath) {
      const source = nodePath.node.source.value;
      nodePath.node.specifiers.forEach(spec => {
        if (spec.type === 'ImportDefaultSpecifier') {
          const resolved = resolveFile(source, id);
          if (resolved) importMap.set(spec.local.name, resolved);
        }
        if (source === '@codespark/react' && spec.type === 'ImportSpecifier' && t.isIdentifier(spec.imported)) {
          if (methods.includes(spec.imported.name)) {
            localNames.set(spec.local.name, spec.imported.name);
          }
        }
      });
    },
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;
      if (!t.isIdentifier(callee) || !localNames.has(callee.name)) return;

      const localName = callee.name;
      const [codeArg] = nodePath.node.arguments;
      let scannedValue: t.Expression | null = null;

      if (t.isJSXElement(codeArg) || t.isJSXFragment(codeArg)) {
        scannedValue = t.valueToNode(collectDependencies(slice(codeArg), id));
      } else if (t.isIdentifier(codeArg)) {
        scannedValue = t.valueToNode(collectDependencies(codeArg.name, id));
      } else if (t.isArrowFunctionExpression(codeArg) || t.isFunctionExpression(codeArg)) {
        scannedValue = t.valueToNode(collectDependencies(slice(codeArg), id));
      }

      if (scannedValue) {
        nodePath.replaceWith(t.callExpression(t.memberExpression(t.identifier(localName), t.identifier('call')), [t.objectExpression([t.objectProperty(t.identifier('__scanned'), scannedValue)]), ...nodePath.node.arguments]));
        modified = true;
      }
    }
  });

  if (modified) return generate(ast).code;

  return null;
};
