import { CSSLoader } from '../loaders';
import { ESLoader } from '../loaders/es-loader';
import { JSONLoader } from '../loaders/json-loader';
import { LoaderType } from '../loaders/types';
import type { Output, Outputs } from '../registry';

const EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs'] as const;

const LOADERS = [new ESLoader({ transform: true, isTSX: true }), new JSONLoader(), new CSSLoader()];

function matchLoader(path: string) {
  return LOADERS.find(loader => loader.test.test(path)) ?? null;
}

function getOutputArray<T extends LoaderType>(outputs: Outputs, type: T) {
  return outputs.get(type) as Output<T>[];
}

function createOutputsMap() {
  const outputs: Outputs = new Map();
  outputs.set(LoaderType.ESModule, []);
  outputs.set(LoaderType.Style, []);
  outputs.set(LoaderType.Script, []);
  outputs.set(LoaderType.Asset, []);
  return outputs;
}

export function resolve(source: string, from: string, files: Record<string, string>) {
  if (!source.startsWith('.') && !source.startsWith('/')) {
    return null;
  }

  const fromDir = from.split('/').slice(0, -1);
  for (const part of source.split('/')) {
    if (part === '..') fromDir.pop();
    else if (part !== '.') fromDir.push(part);
  }
  const resolved = fromDir.join('/') || '.';

  // Try exact path
  if (files[resolved] !== undefined) return resolved;

  // Try with extensions
  for (const ext of EXTENSIONS) {
    if (files[resolved + ext] !== undefined) return resolved + ext;
  }

  // Try index files
  for (const ext of EXTENSIONS) {
    const indexPath = `${resolved}/index${ext}`;
    if (files[indexPath] !== undefined) return indexPath;
  }

  return null;
}

function processFile(path: string, files: Record<string, string>, outputs: Outputs, visited: Set<string>) {
  if (visited.has(path)) return;
  visited.add(path);

  const source = files[path];
  if (source === undefined) return;

  const loader = matchLoader(path);
  if (!loader) return;

  const output = loader.transform(source, {
    resourcePath: path,
    getSource: p => files[p],
    resolve: src => resolve(src, path, files)
  });

  switch (output.type) {
    case LoaderType.ESModule: {
      const { content, dependencies, externals } = output;
      // Process internal dependencies first
      for (const depPath of Object.values(dependencies)) {
        processFile(depPath, files, outputs, visited);
      }
      getOutputArray(outputs, LoaderType.ESModule).push({ path, content, dependencies, externals, raw: source });
      break;
    }
    case LoaderType.Style: {
      const { content, imports, attributes } = output;
      getOutputArray(outputs, LoaderType.Style).push({ path, content, imports, attributes });
      for (const depPath of imports) {
        processFile(depPath, files, outputs, visited);
      }
      break;
    }
  }

  if (output.type === LoaderType.ESModule) {
    const { content, dependencies, externals } = output;
    // Process internal dependencies first
    for (const depPath of Object.values(dependencies)) {
      processFile(depPath, files, outputs, visited);
    }
    getOutputArray(outputs, LoaderType.ESModule).push({ path, content, dependencies, externals, raw: source });
  }
}

export function analyze(files: Record<string, string>) {
  const outputs = createOutputsMap();
  const visited = new Set<string>();

  for (const path of Object.keys(files)) {
    if (path.endsWith('.html')) {
      getOutputArray(outputs, LoaderType.Asset).push({ path, content: files[path] });
    } else {
      const loader = matchLoader(path);
      if (loader) {
        processFile(path, files, outputs, visited);
      }
    }
  }

  return outputs;
}
