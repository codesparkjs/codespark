import type { ExternalDep } from '_shared/types';
import { parse } from '@babel/parser';
import type { Identifier, ImportDeclaration, ImportSpecifier, Statement } from '@babel/types';

export const parseCode = (code: string) => parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

export const collectIdentifiers = (ast: Statement[]): Set<string> => {
  const ids = new Set<string>();
  const boundNames = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (node: any, parent?: any, key?: string) => {
    if (!node || typeof node !== 'object') return;
    if ((node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') && node.id) {
      boundNames.add(node.id.name);
    }
    if ((node.type === 'Identifier' || node.type === 'JSXIdentifier') && !((parent?.type === 'FunctionExpression' || parent?.type === 'FunctionDeclaration') && key === 'id')) {
      ids.add(node.name);
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range') continue;
      const val = node[k];
      if (Array.isArray(val)) val.forEach(v => walk(v, node, k));
      else if (val && typeof val === 'object') walk(val, node, k);
    }
  };
  ast.forEach(n => walk(n));
  boundNames.forEach(name => ids.delete(name));
  return ids;
};

export const buildImportMap = (imports: ImportDeclaration[]): Map<string, string> => {
  const map = new Map<string, string>();
  imports.forEach(imp => {
    if (imp.importKind === 'type') return;
    const source = imp.source.value;
    imp.specifiers.forEach(spec => {
      if (spec.type === 'ImportSpecifier' && spec.importKind === 'type') return;
      map.set(spec.local.name, source);
    });
  });
  return map;
};

export const getUsedSources = (usedIds: Set<string>, importMap: Map<string, string>): Set<string> => {
  const sources = new Set<string>();
  usedIds.forEach(id => {
    if (importMap.has(id)) sources.add(importMap.get(id)!);
  });
  return sources;
};

export const getDefinedNames = (node: Statement): string[] => {
  if (node.type === 'ExportNamedDeclaration' && node.declaration) {
    return getDefinedNames(node.declaration as Statement);
  }
  if (node.type === 'VariableDeclaration') {
    return node.declarations.flatMap(d => (d.id.type === 'Identifier' ? [d.id.name] : []));
  }
  if (node.type === 'FunctionDeclaration' && node.id) return [node.id.name];
  if (node.type === 'ClassDeclaration' && node.id) return [node.id.name];
  return [];
};

export const buildExternalDeps = (imports: ImportDeclaration[], usedSources: Set<string>, code: string, allDependencies: Record<string, string> = {}): ExternalDep[] => {
  const externals = new Map<string, { name: string; version: string; imported: Set<string> }>();

  imports.forEach(imp => {
    if (imp.importKind === 'type') return;
    const source = imp.source.value;
    if (!usedSources.has(source)) return;

    const isUrl = source.startsWith('http://') || source.startsWith('https://');
    const pkgName = isUrl ? source : source.startsWith('@') ? source.split('/').slice(0, 2).join('/') : source.split('/')[0];
    const version = allDependencies[pkgName] || '';
    const namedImports = imp.specifiers.filter(spec => spec.type === 'ImportSpecifier' && spec.importKind !== 'type').map(spec => ((spec as ImportSpecifier).imported as Identifier).name);

    if (externals.has(pkgName)) {
      namedImports.forEach(name => externals.get(pkgName)!.imported.add(name));
    } else {
      externals.set(pkgName, { name: pkgName, version, imported: new Set(namedImports) });
    }
  });

  return [...externals.values()].map(dep => ({ ...dep, imported: [...dep.imported] }));
};
