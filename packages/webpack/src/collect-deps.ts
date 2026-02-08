import fs from 'node:fs';
import path from 'node:path';

import { parse } from '@babel/parser';
import type { ImportDeclaration, ImportSpecifier, Statement } from '@babel/types';

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
const pathsConfig = tsconfigJson.compilerOptions?.paths || {};
const aliases = Object.keys(pathsConfig).map(p => p.replace('/*', ''));

function parseCode(code: string) {
  return parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;
}

function collectIdentifiers(ast: Statement[]) {
  const ids = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'Identifier' || node.type === 'JSXIdentifier') {
      ids.add(node.name);
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;

      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === 'object') {
        walk(value);
      }
    }
  }

  ast.forEach(walk);
  return ids;
}

function buildImportMap(imports: ImportDeclaration[]) {
  const map = new Map<string, string>();

  for (const imp of imports) {
    if (imp.importKind === 'type') continue;

    const source = imp.source.value;
    for (const spec of imp.specifiers) {
      if (spec.type === 'ImportSpecifier' && spec.importKind === 'type') continue;
      map.set(spec.local.name, source);
    }
  }

  return map;
}

function getUsedSources(usedIds: Set<string>, importMap: Map<string, string>) {
  const sources = new Set<string>();

  for (const id of usedIds) {
    const source = importMap.get(id);
    if (source) sources.add(source);
  }

  return sources;
}

function getDefinedNames(node: Statement) {
  if (node.type === 'ExportNamedDeclaration' && node.declaration) {
    return getDefinedNames(node.declaration as Statement);
  }

  if (node.type === 'VariableDeclaration') {
    return node.declarations.flatMap(d => (d.id.type === 'Identifier' ? [d.id.name] : []));
  }

  if (node.type === 'FunctionDeclaration' && node.id) {
    return [node.id.name];
  }

  if (node.type === 'ClassDeclaration' && node.id) {
    return [node.id.name];
  }

  return [];
}

function findMatchingAlias(source: string) {
  for (const alias of aliases) {
    if (source === alias || source.startsWith(alias + '/')) {
      return alias;
    }
  }
  return null;
}

function resolveAlias(source: string) {
  const alias = findMatchingAlias(source);
  if (!alias) return source;

  const aliasPath = pathsConfig[alias + '/*'][0].replace('/*', '');
  return source.replace(alias, path.resolve(pkgPath, aliasPath));
}

function resolveFile(source: string, fromFile: string) {
  const resolved = source.startsWith('.') ? path.resolve(path.dirname(fromFile), source) : resolveAlias(source);

  const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
  for (const ext of extensions) {
    const tryPath = resolved + ext;
    if (fs.existsSync(tryPath)) return tryPath;
  }

  return fs.existsSync(resolved) ? resolved : null;
}

function isLocalImport(source: string) {
  if (source.startsWith('.') || source.startsWith('/')) return true;
  return findMatchingAlias(source) !== null;
}

function isAliasImport(source: string) {
  return !source.startsWith('.') && !source.startsWith('/') && findMatchingAlias(source) !== null;
}

function aliasToRelative(source: string, resolved?: string) {
  const alias = findMatchingAlias(source);
  if (!alias) return source;

  if (source === alias) return '.';

  let rel = './' + source.slice(alias.length + 1);
  if (resolved) {
    const ext = path.extname(resolved);
    if (ext && !rel.endsWith(ext)) {
      rel += ext;
    }
  }

  return rel;
}

function rewriteAliasImports(code: string, filePath: string) {
  let result = code;
  const ast = parseCode(code);

  for (const node of ast) {
    if (node.type !== 'ImportDeclaration') continue;

    const source = node.source.value;
    if (!isAliasImport(source)) continue;

    const resolved = resolveFile(source, filePath);
    if (!resolved) continue;

    let rel = path.relative(path.dirname(filePath), resolved);
    if (!rel.startsWith('.')) {
      rel = './' + rel;
    }

    result = result.replace(`'${source}'`, `'${rel}'`);
    result = result.replace(`"${source}"`, `"${rel}"`);
  }

  return result;
}

function collectFromFile(file: string, usedSources: Set<string>, result: Record<string, FileInfo>, visited: Set<string>) {
  if (visited.has(file)) return;
  visited.add(file);

  const content = fs.readFileSync(file, 'utf-8');
  const ast = parseCode(content);
  const imports = ast.filter((node): node is ImportDeclaration => node.type === 'ImportDeclaration');

  for (const imp of imports) {
    if (imp.importKind === 'type') continue;

    const source = imp.source.value;
    if (!usedSources.has(source) || !isLocalImport(source)) continue;

    const resolved = resolveFile(source, file);
    if (!resolved || result[source]) continue;

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
}

function formatSpecifierName(spec: ImportDeclaration['specifiers'][number]) {
  if (spec.type === 'ImportDefaultSpecifier') {
    return spec.local.name;
  }

  if (spec.type === 'ImportNamespaceSpecifier') {
    return `* as ${spec.local.name}`;
  }

  const importSpec = spec as ImportSpecifier;
  const imported = importSpec.imported;
  const hasAlias = imported && 'name' in imported && imported.name !== spec.local.name;

  return hasAlias ? `${(imported as { name: string }).name} as ${spec.local.name}` : spec.local.name;
}

function generateImportStatement(imp: ImportDeclaration, usedIds: Set<string>, sourcePath?: string) {
  const usedSpecifiers = imp.specifiers.filter(s => usedIds.has(s.local.name));
  if (usedSpecifiers.length === 0) return null;

  const parts: string[] = [];
  const namedImports: string[] = [];

  for (const spec of usedSpecifiers) {
    const name = formatSpecifierName(spec);

    if (spec.type === 'ImportDefaultSpecifier') {
      parts.unshift(name);
    } else if (spec.type === 'ImportNamespaceSpecifier') {
      parts.push(name);
    } else {
      namedImports.push(name);
    }
  }

  if (namedImports.length > 0) {
    parts.push(`{ ${namedImports.join(', ')} }`);
  }

  const source = sourcePath ?? imp.source.value;
  return `import ${parts.join(', ')} from '${source}';`;
}

function isUsedImport(imp: ImportDeclaration, usedSources: Set<string>) {
  return imp.importKind !== 'type' && usedSources.has(imp.source.value);
}

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

    // Build map of local definitions (non-imported names)
    const localDefs = new Map<string, { node: Statement; code: string }>();
    for (const node of hostAst) {
      if (node.type === 'ImportDeclaration') continue;

      for (const name of getDefinedNames(node)) {
        if (!importedNames.has(name)) {
          localDefs.set(name, { node, code: hostContent.slice(node.start!, node.end!) });
        }
      }
    }

    // Recursively collect local dependencies
    function collectLocalDeps(ids: Set<string>, collected: Set<string>) {
      for (const id of ids) {
        if (collected.has(id) || !localDefs.has(id)) continue;

        collected.add(id);
        const def = localDefs.get(id)!;
        collectLocalDeps(collectIdentifiers([def.node]), collected);
      }
    }

    const collectedNames = new Set<string>();
    collectLocalDeps(codeUsedIds, collectedNames);

    // Extract local code snippets that are used
    const locals: string[] = [];
    for (const node of hostAst) {
      if (node.type === 'ImportDeclaration') continue;

      const hasUsedName = getDefinedNames(node).some(name => collectedNames.has(name));
      if (hasUsedName) {
        locals.push(hostContent.slice(node.start!, node.end!));
      }
    }

    // Collect all used identifiers including from local definitions
    const allUsedIds = new Set(codeUsedIds);
    for (const name of collectedNames) {
      const def = localDefs.get(name);
      if (def) {
        for (const id of collectIdentifiers([def.node])) {
          allUsedIds.add(id);
        }
      }
    }

    const hostImportMap = buildImportMap(hostImports);
    const usedSources = getUsedSources(allUsedIds, hostImportMap);
    collectFromFile(file, usedSources, fileInfos, visited);

    // Build files map with normalized keys
    const files: Record<string, string> = {};
    for (const [source, info] of Object.entries(fileInfos)) {
      const key = isAliasImport(source) ? aliasToRelative(source, info.resolved) : source;
      files[key] = info.code;
    }

    // Generate alias imports
    const aliasImports: string[] = [];
    for (const imp of hostImports) {
      if (!isUsedImport(imp, usedSources) || !isAliasImport(imp.source.value)) continue;

      const resolved = resolveFile(imp.source.value, file);
      if (!resolved) continue;

      const statement = generateImportStatement(imp, allUsedIds, aliasToRelative(imp.source.value));
      if (statement) aliasImports.push(statement);
    }

    // Generate external imports
    const externalImports: string[] = [];
    for (const imp of hostImports) {
      if (!isUsedImport(imp, usedSources) || isLocalImport(imp.source.value)) continue;

      const statement = generateImportStatement(imp, allUsedIds);
      if (statement) externalImports.push(statement);
    }

    return {
      entry: { code, locals, imports: [...aliasImports, ...externalImports] },
      files
    };
  } catch {
    return { entry: { code, locals: [], imports: [] }, files: {} };
  }
}
