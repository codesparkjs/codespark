import { parse } from '@babel/parser';
import { availablePresets, transform } from '@babel/standalone';
import type { Identifier, ImportDeclaration, ImportSpecifier, Statement } from '@babel/types';

import { type ESModuleLoaderOutput, type Loader, type LoaderContext, LoaderType } from './types';

const parseCode = (code: string) => parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

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

const buildExternalDeps = (imports: ImportDeclaration[], usedSources: Set<string>) => {
  const externals = new Map<string, { name: string; imported: Set<string> }>();
  imports.forEach(imp => {
    if (imp.importKind === 'type') return;
    const source = imp.source.value;
    if (!usedSources.has(source) || source.startsWith('.') || source.startsWith('/')) return;

    const namedImports = imp.specifiers.filter(spec => spec.type === 'ImportSpecifier' && spec.importKind !== 'type').map(spec => ((spec as ImportSpecifier).imported as Identifier).name);

    const existing = externals.get(source);
    if (existing) namedImports.forEach(name => existing.imported.add(name));
    else externals.set(source, { name: source, imported: new Set(namedImports) });
  });
  return [...externals.values()].map(dep => ({ ...dep, imported: [...dep.imported] }));
};

export interface ESLoaderOptions {
  /** JSX preset, e.g. [availablePresets.react, { runtime: 'automatic' }] */
  jsxPreset?: [unknown, Record<string, unknown>];
  /** Whether to enable TSX support, default false */
  isTSX?: boolean;
}

export class ESLoader implements Loader<LoaderType.ESModule> {
  readonly name = 'es-loader';
  readonly test = /\.(tsx?|jsx?)$/;

  constructor(private options?: ESLoaderOptions) {}

  transform(source: string, ctx: LoaderContext): ESModuleLoaderOutput {
    const ast = parseCode(source);
    const { imports, usedSources } = analyzeImports(ast);
    const externals = buildExternalDeps(imports, usedSources);
    const dependencies: Record<string, string> = {};

    for (const imp of imports) {
      if (imp.importKind === 'type') continue;
      const importPath = imp.source.value;

      if (imp.specifiers.length === 0) {
        const resolved = ctx.resolve(importPath);
        if (resolved) dependencies[importPath] = resolved;
        continue;
      }

      if (!usedSources.has(importPath)) continue;

      const resolved = ctx.resolve(importPath);
      if (resolved) dependencies[importPath] = resolved;
    }

    const { jsxPreset, isTSX = false } = this.options || {};
    const { typescript } = availablePresets;
    const defaultPresets = [typescript, { isTSX, allExtensions: true }];
    const { code } = transform(source, {
      filename: ctx.resourcePath,
      presets: jsxPreset ? [jsxPreset, defaultPresets] : [defaultPresets]
    });

    return { type: LoaderType.ESModule, content: code || '', dependencies, externals, raw: source };
  }
}
