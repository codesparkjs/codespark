import { parse } from '@babel/parser';
import { availablePresets, transform } from '@babel/standalone';
import type { Identifier, ImportDeclaration, ImportSpecifier, Statement } from '@babel/types';

import type { ExternalDep, Loader, LoaderContext, LoaderOutput } from './types';
import { OutputType } from './types';

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

const buildExternalDeps = (imports: ImportDeclaration[], usedSources: Set<string>): ExternalDep[] => {
  const externals = new Map<string, { name: string; version: string; imported: Set<string> }>();
  imports.forEach(imp => {
    if (imp.importKind === 'type') return;
    const source = imp.source.value;
    if (!usedSources.has(source) || source.startsWith('.') || source.startsWith('/')) return;

    const namedImports = imp.specifiers.filter(spec => spec.type === 'ImportSpecifier' && spec.importKind !== 'type').map(spec => ((spec as ImportSpecifier).imported as Identifier).name);

    const existing = externals.get(source);
    if (existing) namedImports.forEach(name => existing.imported.add(name));
    else externals.set(source, { name: source, version: '', imported: new Set(namedImports) });
  });
  return [...externals.values()].map(dep => ({ ...dep, imported: [...dep.imported] }));
};

export interface ESLoaderOptions {
  /** JSX preset, e.g. [availablePresets.react, { runtime: 'automatic' }] */
  jsxPreset: [unknown, Record<string, unknown>];
  /** Whether to enable TSX support, default false */
  isTSX?: boolean;
}

export class ESLoader implements Loader {
  readonly name = 'es-loader';
  readonly test = /\.(tsx?|jsx?)$/;
  readonly outputType = OutputType.ESModule;

  private jsxPreset: ESLoaderOptions['jsxPreset'];
  private isTSX: boolean;

  constructor(options: ESLoaderOptions) {
    this.jsxPreset = options.jsxPreset;
    this.isTSX = options.isTSX ?? false;
  }

  transform(source: string, ctx: LoaderContext): LoaderOutput {
    const ast = parseCode(source);
    const { imports, usedSources } = analyzeImports(ast);
    const dependencies: string[] = [];
    const externals = buildExternalDeps(imports, usedSources);

    for (const imp of imports) {
      if (imp.importKind === 'type') continue;
      const importPath = imp.source.value;

      if (imp.specifiers.length === 0) {
        const resolved = ctx.resolve(importPath);
        if (resolved) dependencies.push(resolved);
        continue;
      }

      if (!usedSources.has(importPath)) continue;

      const resolved = ctx.resolve(importPath);
      if (resolved) dependencies.push(resolved);
    }

    const { typescript } = availablePresets;
    const { code } = transform(source, {
      filename: ctx.resourcePath,
      presets: [this.jsxPreset, [typescript, { isTSX: this.isTSX, allExtensions: true }]]
    });

    return {
      type: OutputType.ESModule,
      content: code || '',
      dependencies,
      externals
    };
  }
}
