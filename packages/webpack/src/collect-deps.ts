import fs from 'node:fs';
import path from 'node:path';

import { parse } from '@babel/parser';
import type { ImportDeclaration, Statement } from '@babel/types';

interface FileInfo {
  code: string;
  resolved: string;
  externals: string[];
}

interface CollectResult {
  entry: { code: string; locals: string[]; imports: string[] };
  files: Record<string, string>;
}

const pkgPath = process.cwd();
const tsconfigJson = JSON.parse(fs.readFileSync(path.resolve(pkgPath, 'tsconfig.json'), 'utf-8'));
const aliases = Object.keys(tsconfigJson.compilerOptions?.paths || {}).map(p => p.replace('/*', ''));

const parseCode = (code: string) => parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

const collectIdentifiers = (ast: Statement[]): Set<string> => {
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

const buildImportMap = (imports: ImportDeclaration[]): Map<string, string> => {
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

const getUsedSources = (usedIds: Set<string>, importMap: Map<string, string>): Set<string> => {
  const sources = new Set<string>();
  usedIds.forEach(id => {
    if (importMap.has(id)) sources.add(importMap.get(id)!);
  });
  return sources;
};

const getDefinedNames = (node: Statement): string[] => {
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

const resolveFile = (source: string, fromFile: string): string | null => {
  const resolved = source.startsWith('.') ? path.resolve(path.dirname(fromFile), source) : resolveAlias(source);

  const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
  for (const ext of extensions) {
    const tryPath = resolved + ext;
    if (fs.existsSync(tryPath)) return tryPath;
  }
  return fs.existsSync(resolved) ? resolved : null;
};

const resolveAlias = (source: string): string => {
  for (const alias of aliases) {
    if (source === alias || source.startsWith(alias + '/')) {
      const aliasPath = tsconfigJson.compilerOptions.paths[alias + '/*'][0].replace('/*', '');
      return source.replace(alias, path.resolve(pkgPath, aliasPath));
    }
  }
  return source;
};

const isLocalImport = (source: string): boolean => {
  if (source.startsWith('.') || source.startsWith('/')) return true;
  return aliases.some(alias => source === alias || source.startsWith(alias + '/'));
};

const isAliasImport = (source: string): boolean => {
  return !source.startsWith('.') && !source.startsWith('/') && isLocalImport(source);
};

const aliasToRelative = (source: string, resolved?: string): string => {
  for (const alias of aliases) {
    if (source.startsWith(alias + '/')) {
      let rel = './' + source.slice(alias.length + 1);
      if (resolved) {
        const ext = path.extname(resolved);
        if (ext && !rel.endsWith(ext)) rel += ext;
      }
      return rel;
    }
    if (source === alias) return '.';
  }
  return source;
};

const rewriteAliasImports = (code: string, filePath: string): string => {
  let result = code;
  const ast = parseCode(code);

  for (const node of ast) {
    if (node.type !== 'ImportDeclaration') continue;
    const source = node.source.value;
    if (!isAliasImport(source)) continue;

    const resolved = resolveFile(source, filePath);
    if (!resolved) continue;

    let rel = path.relative(path.dirname(filePath), resolved);
    if (!rel.startsWith('.')) rel = './' + rel;

    result = result.replace(`'${source}'`, `'${rel}'`);
    result = result.replace(`"${source}"`, `"${rel}"`);
  }

  return result;
};

const collectFromFile = (file: string, usedSources: Set<string>, result: Record<string, FileInfo>, visited: Set<string>): void => {
  if (visited.has(file)) return;
  visited.add(file);

  const content = fs.readFileSync(file, 'utf-8');
  const ast = parseCode(content);
  const imports = ast.filter((node): node is ImportDeclaration => node.type === 'ImportDeclaration');

  imports.forEach(imp => {
    if (imp.importKind === 'type') return;
    const source = imp.source.value;
    if (!usedSources.has(source) || !isLocalImport(source)) return;

    const resolved = resolveFile(source, file);
    if (resolved && !result[source]) {
      const childCode = fs.readFileSync(resolved, 'utf-8');
      const childAst = parseCode(childCode);
      const childImports = childAst.filter((n): n is ImportDeclaration => n.type === 'ImportDeclaration');
      const childBody = childAst.filter(n => n.type !== 'ImportDeclaration');
      const childUsedIds = collectIdentifiers(childBody);
      const childImportMap = buildImportMap(childImports);
      const childUsedSources = getUsedSources(childUsedIds, childImportMap);
      const externals = childImports.filter(i => i.importKind !== 'type' && !isLocalImport(i.source.value) && childUsedSources.has(i.source.value)).map(i => i.source.value);

      result[source] = { code: rewriteAliasImports(childCode, resolved), resolved, externals };
      collectFromFile(resolved, childUsedSources, result, visited);
    }
  });
};

const generateImportStatement = (imp: ImportDeclaration, usedIds: Set<string>, sourcePath?: string): string | null => {
  const usedSpecifiers = imp.specifiers.filter(s => usedIds.has(s.local.name));
  if (usedSpecifiers.length === 0) return null;
  const names = usedSpecifiers.map(s => {
    if (s.type === 'ImportDefaultSpecifier') return s.local.name;
    if (s.type === 'ImportNamespaceSpecifier') return `* as ${s.local.name}`;
    return s.imported && 'name' in s.imported && s.imported.name !== s.local.name ? `${s.imported.name} as ${s.local.name}` : s.local.name;
  });
  const hasDefault = usedSpecifiers.some(s => s.type === 'ImportDefaultSpecifier');
  const hasNamespace = usedSpecifiers.some(s => s.type === 'ImportNamespaceSpecifier');
  const named = names.filter((_, i) => usedSpecifiers[i].type === 'ImportSpecifier');
  const parts: string[] = [];
  if (hasDefault) parts.push(names.find((_, i) => usedSpecifiers[i].type === 'ImportDefaultSpecifier')!);
  if (hasNamespace) parts.push(names.find((_, i) => usedSpecifiers[i].type === 'ImportNamespaceSpecifier')!);
  if (named.length) parts.push(`{ ${named.join(', ')} }`);
  return `import ${parts.join(', ')} from '${sourcePath ?? imp.source.value}';`;
};

export function collectDependencies(code: string, hostFile: string): CollectResult {
  const fileInfos: Record<string, FileInfo> = {};
  const file = path.resolve(hostFile);
  const visited = new Set<string>();

  try {
    const codeAst = parseCode(code);
    const codeUsedIds = collectIdentifiers(codeAst);

    const hostContent = fs.readFileSync(file, 'utf-8');
    const hostAst = parseCode(hostContent);
    const hostImports = hostAst.filter((node): node is ImportDeclaration => node.type === 'ImportDeclaration');
    const importedNames = new Set(buildImportMap(hostImports).keys());

    const localDefs = new Map<string, { node: (typeof hostAst)[0]; code: string }>();
    hostAst.forEach(node => {
      if (node.type === 'ImportDeclaration') return;
      getDefinedNames(node).forEach(name => {
        if (!importedNames.has(name)) {
          localDefs.set(name, { node, code: hostContent.slice(node.start!, node.end!) });
        }
      });
    });

    const collectLocalDeps = (ids: Set<string>, collected: Set<string>): void => {
      ids.forEach(id => {
        if (collected.has(id) || !localDefs.has(id)) return;
        collected.add(id);
        collectLocalDeps(collectIdentifiers([localDefs.get(id)!.node]), collected);
      });
    };

    const collectedNames = new Set<string>();
    collectLocalDeps(codeUsedIds, collectedNames);

    const locals: string[] = [];
    hostAst.forEach(node => {
      if (node.type === 'ImportDeclaration') return;
      if (getDefinedNames(node).some(name => collectedNames.has(name))) {
        locals.push(hostContent.slice(node.start!, node.end!));
      }
    });

    const allUsedIds = new Set(codeUsedIds);
    collectedNames.forEach(name => {
      const def = localDefs.get(name);
      if (def) collectIdentifiers([def.node]).forEach(id => allUsedIds.add(id));
    });

    const hostImportMap = buildImportMap(hostImports);
    const usedSources = getUsedSources(allUsedIds, hostImportMap);
    collectFromFile(file, usedSources, fileInfos, visited);

    const files: Record<string, string> = {};
    for (const [source, info] of Object.entries(fileInfos)) {
      const key = isAliasImport(source) ? aliasToRelative(source, info.resolved) : source;
      files[key] = info.code;
    }

    const aliasImports = hostImports
      .filter(imp => imp.importKind !== 'type' && isAliasImport(imp.source.value) && usedSources.has(imp.source.value))
      .map(imp => {
        const resolved = resolveFile(imp.source.value, file);
        if (!resolved) return null;
        return generateImportStatement(imp, allUsedIds, aliasToRelative(imp.source.value));
      })
      .filter((s): s is string => s !== null);

    const externalImports = hostImports
      .filter(imp => imp.importKind !== 'type' && !isLocalImport(imp.source.value) && usedSources.has(imp.source.value))
      .map(imp => generateImportStatement(imp, allUsedIds))
      .filter((s): s is string => s !== null);

    return { entry: { code, locals, imports: [...aliasImports, ...externalImports] }, files };
  } catch {
    return { entry: { code, locals: [], imports: [] }, files: {} };
  }
}
