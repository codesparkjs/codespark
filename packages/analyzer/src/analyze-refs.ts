import type { Dep, InternalDep } from '_shared/types';
import type { ImportDeclaration } from '@babel/types';

import { buildExternalDeps, buildImportMap, collectIdentifiers, getUsedSources, parseCode } from './shared';

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

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

const buildInternalDep = (source: string, content: string, files: Record<string, string>, visited: Set<string>, alias: string): InternalDep | null => {
  if (visited.has(source)) return null;
  visited.add(source);

  const ast = parseCode(content);
  const imports = ast.filter((node): node is ImportDeclaration => node.type === 'ImportDeclaration');
  const body = ast.filter(node => node.type !== 'ImportDeclaration');

  const usedIds = collectIdentifiers(body);
  const importMap = buildImportMap(imports);
  const usedSources = getUsedSources(usedIds, importMap);

  const deps: Dep[] = [];
  imports.forEach(imp => {
    if (imp.importKind === 'type') return;
    const src = imp.source.value;
    if (!usedSources.has(src)) return;

    const resolved = resolveSource(src, files);
    if (resolved) {
      const child = buildInternalDep(resolved, files[resolved], files, visited, src);
      if (child) deps.push(child);
    }
  });

  const externals = buildExternalDeps(imports, usedSources);
  deps.push(...externals);

  return { name: source.split('/').pop() || source, alias, code: content, dts: '', deps };
};

export function analyzeReferences(code: string, files: Record<string, string>) {
  try {
    const codeAst = parseCode(code);
    const codeImports = codeAst.filter((node): node is ImportDeclaration => node.type === 'ImportDeclaration');
    const codeBody = codeAst.filter(node => node.type !== 'ImportDeclaration');
    const allUsedIds = collectIdentifiers(codeBody);
    const importMap = buildImportMap(codeImports);
    const usedSources = getUsedSources(allUsedIds, importMap);
    const depsMap = new Map<string, Dep>();

    codeImports.forEach(imp => {
      if (imp.importKind === 'type') return;
      const source = imp.source.value;
      if (!usedSources.has(source)) return;

      const resolved = resolveSource(source, files);
      if (resolved) {
        const dep = buildInternalDep(resolved, files[resolved], files, new Set(), source);
        if (dep) depsMap.set(dep.name, dep);
      }
    });

    const externals = buildExternalDeps(codeImports, usedSources);
    externals.forEach(dep => depsMap.set(dep.name, dep));

    return [...depsMap.values()];
  } catch {
    return [];
  }
}
