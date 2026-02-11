import { availablePresets } from '@babel/standalone';

import { CSSLoader } from '../loaders/css-loader';
import { ESLoader } from '../loaders/es-loader';
import { JSONLoader } from '../loaders/json-loader';
import { MarkdownLoader } from '../loaders/markdown-loader';
import { LoaderType } from '../loaders/types';
import type { Output, Outputs } from '../registry';

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'] as const;

const LOADERS = [
  new ESLoader({
    jsxPreset: [availablePresets.react, { runtime: 'automatic' }],
    isTSX: true
  }),
  new CSSLoader(),
  new JSONLoader(),
  new MarkdownLoader()
];

function matchLoader(path: string) {
  return LOADERS.find(loader => loader.test.test(path)) ?? null;
}

function getOutputList<T extends LoaderType>(outputs: Outputs, type: T) {
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

  if (files[resolved] !== undefined) return resolved;

  for (const ext of EXTENSIONS) {
    if (files[resolved + ext] !== undefined) return resolved + ext;
  }

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
      for (const depPath of Object.values(dependencies)) {
        processFile(depPath, files, outputs, visited);
      }
      getOutputList(outputs, LoaderType.ESModule).push({ path, content, dependencies, externals, raw: source });
      break;
    }
    case LoaderType.Style: {
      const { content, imports, attributes } = output;
      getOutputList(outputs, LoaderType.Style).push({ path, content, imports, attributes });
      for (const depPath of imports) {
        processFile(depPath, files, outputs, visited);
      }
      break;
    }
    default: {
      const { content } = output;
      getOutputList(outputs, LoaderType.ESModule).push({
        path,
        content: `import { jsx as _jsx } from 'react/jsx-runtime';
export default function MarkdownContent() {
  return _jsx('div', { dangerouslySetInnerHTML: { __html: ${JSON.stringify(content)} } });
}`,
        dependencies: {},
        externals: [],
        raw: content
      });
    }
  }
}

export function analyze(files: Record<string, string>) {
  const outputs = createOutputsMap();
  const visited = new Set<string>();

  for (const path of Object.keys(files)) {
    const loader = matchLoader(path);
    if (loader) {
      processFile(path, files, outputs, visited);
    }
  }

  return outputs;
}
