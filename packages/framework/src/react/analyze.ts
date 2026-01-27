import type { Dep, ExternalDep, InternalDep } from '_shared/types';
import { parse } from '@babel/parser';
import type { Identifier, ImportDeclaration, ImportSpecifier, Statement } from '@babel/types';

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const CSS_EXTENSION = '.css';

const resolveSource = (source: string, files: Record<string, string>): string | null => {
  if (files[source]) return source;
  for (const ext of EXTENSIONS) {
    if (files[source + ext]) return source + ext;
  }
  for (const ext of EXTENSIONS) {
    const indexPath = source + '/index' + ext;
    if (files[indexPath]) return indexPath;
  }
  return null;
};

const resolvePath = (from: string, to: string) => {
  if (!to.startsWith('.')) return to;
  const fromDir = from.split('/').slice(0, -1);
  for (const part of to.split('/')) {
    if (part === '..') fromDir.pop();
    else if (part !== '.') fromDir.push(part);
  }
  return fromDir.join('/') || '.';
};

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

const buildInternalDep = (source: string, content: string, files: Record<string, string>, visited: Set<string>, alias: string): InternalDep | null => {
  if (visited.has(source)) return null;
  visited.add(source);

  const { imports, usedSources } = analyzeImports(parseCode(content));
  const deps: Dep[] = [];

  imports.forEach(imp => {
    if (imp.importKind === 'type') return;

    const src = imp.source.value;
    if (!usedSources.has(src)) return;

    const normalizedSrc = resolvePath(source, src);
    const resolved = resolveSource(normalizedSrc, files);
    if (resolved) {
      const child = buildInternalDep(resolved, files[resolved], files, visited, src);
      if (child) deps.push(child);
    }
  });

  deps.push(...buildExternalDeps(imports, usedSources));
  return { name: source.split('/').pop() || source, alias, code: content, deps };
};

export function analyze(entry: string, files: Record<string, string>) {
  try {
    const { imports, usedSources } = analyzeImports(parseCode(files[entry]));
    const depsMap = new Map<string, Dep>();

    imports.forEach(imp => {
      if (imp.importKind === 'type') return;
      const source = imp.source.value;

      if (imp.specifiers.length === 0 && source.endsWith(CSS_EXTENSION)) {
        depsMap.set(source, { name: '', alias: source, code: files[source], deps: [] });
      } else if (usedSources.has(source)) {
        const resolved = resolveSource(source, files);
        if (resolved) {
          const dep = buildInternalDep(resolved, files[resolved], files, new Set(), source);
          if (dep) depsMap.set(dep.name, dep);
        }
      }
    });

    buildExternalDeps(imports, usedSources).forEach(dep => depsMap.set(dep.name, dep));
    return [...depsMap.values()];
  } catch {
    return [];
  }
}
