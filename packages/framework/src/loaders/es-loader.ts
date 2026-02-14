import { parse } from '@babel/parser';
import { availablePresets, transform } from '@babel/standalone';
import type { CallExpression, Identifier, ImportDeclaration, ImportSpecifier, Statement, StringLiteral } from '@babel/types';

import { type ESModuleLoaderOutput, type Loader, type LoaderContext, LoaderType } from './types';

const parseCode = (code: string) => parse(code, { sourceType: 'unambiguous', plugins: ['jsx', 'typescript'] }).program.body;

const collectIdentifiers = (ast: Statement[]) => {
  const ids = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Identifier' || node.type === 'JSXIdentifier') ids.add(node.name);
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range') continue;
      const val = node[k];
      if (Array.isArray(val)) val.forEach(walk);
      else if (val && typeof val === 'object') walk(val);
    }
  };
  ast.forEach(walk);
  return ids;
};

const collectRequires = (ast: Statement[]): Set<string> => {
  const requires = new Set<string>();
  const isExternal = (name: string) => !name.startsWith('.') && !name.startsWith('/');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'CallExpression') {
      const call = node as CallExpression;
      const callee = call.callee;

      if (callee.type === 'Identifier' && callee.name === 'require' && call.arguments.length > 0) {
        const arg = call.arguments[0];
        if (arg.type === 'StringLiteral') {
          const moduleName = (arg as StringLiteral).value;
          if (isExternal(moduleName)) {
            requires.add(moduleName);
          }
        }
      }
    }

    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range') continue;
      const val = node[k];
      if (Array.isArray(val)) val.forEach(walk);
      else if (val && typeof val === 'object') walk(val);
    }
  };

  ast.forEach(walk);
  return requires;
};

const analyzeImports = (ast: Statement[]) => {
  const imports = ast.filter((node): node is ImportDeclaration => node.type === 'ImportDeclaration');
  const body = ast.filter(node => node.type !== 'ImportDeclaration');
  const usedIds = collectIdentifiers(body);

  const importMap = new Map<string, string>();
  imports.forEach(imp => {
    if (imp.importKind === 'type') return;
    imp.specifiers.forEach(spec => {
      if (spec.type === 'ImportSpecifier' && spec.importKind === 'type') return;
      importMap.set(spec.local.name, imp.source.value);
    });
  });

  const usedSources = new Set<string>();
  usedIds.forEach(id => {
    if (importMap.has(id)) usedSources.add(importMap.get(id)!);
  });

  return { imports, usedSources };
};

const buildExternalDeps = (imports: ImportDeclaration[], requires: Set<string>) => {
  const externals = new Map<string, { name: string; imported: Set<string> }>();

  // Add ESM imports
  imports.forEach(imp => {
    if (imp.importKind === 'type') return;
    const source = imp.source.value;
    if (source.startsWith('.') || source.startsWith('/')) return;

    const namedImports = imp.specifiers.filter(spec => spec.type === 'ImportSpecifier' && spec.importKind !== 'type').map(spec => ((spec as ImportSpecifier).imported as Identifier).name);

    const existing = externals.get(source);
    if (existing) namedImports.forEach(name => existing.imported.add(name));
    else externals.set(source, { name: source, imported: new Set(namedImports) });
  });

  // Add CJS requires
  requires.forEach(name => {
    if (!externals.has(name)) {
      externals.set(name, { name, imported: new Set() });
    }
  });

  return [...externals.values()].map(dep => ({ ...dep, imported: [...dep.imported] }));
};

export interface ESLoaderOptions {
  /** JSX preset, e.g. [availablePresets.react, { runtime: 'automatic' }] */
  jsxPreset?: [unknown, Record<string, unknown>];
  /** Whether to enable TSX support, default false */
  isTSX?: boolean;
  /**
   * Transform ESM to CJS
   *
   * @default false
   **/
  transform?: boolean;
}

export class ESLoader implements Loader<LoaderType.ESModule> {
  readonly name = 'es-loader';
  readonly test = /\.(tsx?|jsx?)$/;

  constructor(private options?: ESLoaderOptions) {}

  transform(source: string, ctx: LoaderContext): ESModuleLoaderOutput {
    const ast = parseCode(source);
    const { imports } = analyzeImports(ast);
    const requires = collectRequires(ast);
    const externals = buildExternalDeps(imports, requires);
    const dependencies: Record<string, string> = {};

    for (const imp of imports) {
      if (imp.importKind === 'type') continue;
      const importPath = imp.source.value;

      const resolved = ctx.resolve(importPath);
      if (resolved) dependencies[importPath] = resolved;
    }

    const { jsxPreset, isTSX = false, transform: toCJS = false } = this.options || {};
    const { typescript } = availablePresets;
    const defaultPresets = [typescript, { isTSX, allExtensions: true }];
    const plugins = toCJS ? ['transform-modules-commonjs'] : [];
    const { code } = transform(source, {
      filename: ctx.resourcePath,
      presets: jsxPreset ? [jsxPreset, defaultPresets] : [defaultPresets],
      plugins
    });

    return {
      type: LoaderType.ESModule,
      content: code || '',
      dependencies,
      externals,
      raw: source
    };
  }
}
