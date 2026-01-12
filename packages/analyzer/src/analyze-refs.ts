import type { Dep, InternalDep } from '_shared/types';
import type { ImportDeclaration } from '@babel/types';

import { buildExternalDeps, buildImportMap, collectIdentifiers, getUsedSources, parseCode } from './shared';

const buildInternalDep = (source: string, content: string, files: Record<string, string>, visited: Set<string>): InternalDep | null => {
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

    if (files[src]) {
      const child = buildInternalDep(src, files[src], files, visited);
      if (child) deps.push(child);
    }
  });

  const externals = buildExternalDeps(imports, usedSources, content);
  deps.push(...externals);

  return { name: source.split('/').pop() || source, alias: source, code: content, dts: '', deps };
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

      if (files[source]) {
        const dep = buildInternalDep(source, files[source], files, new Set());
        if (dep) depsMap.set(dep.name, dep);
      }
    });

    const externals = buildExternalDeps(codeImports, usedSources, code);
    externals.forEach(dep => depsMap.set(dep.name, dep));

    return [...depsMap.values()];
  } catch {
    return [];
  }
}
