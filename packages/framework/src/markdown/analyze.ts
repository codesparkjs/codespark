import { MarkdownLoader } from '../loaders/markdown-loader';
import { LoaderType } from '../loaders/types';
import type { Output, Outputs } from '../registry';

const LOADERS = [new MarkdownLoader()];

function matchLoader(path: string) {
  return LOADERS.find(l => l.test.test(path)) ?? null;
}

function processFile(path: string, files: Record<string, string>, outputs: Outputs = new Map(), visited = new Set<string>()) {
  if (visited.has(path)) return;
  visited.add(path);

  const source = files[path];
  if (source === undefined) return;

  const loader = matchLoader(path);
  if (!loader) return;

  const output = loader.transform(source);

  const result = { path, content: output.content };
  (outputs.get(output.type) as Output<LoaderType.Asset>[]).push(result);
}

export function analyze(files: Record<string, string>) {
  const outputs: Outputs = new Map();
  outputs.set(LoaderType.ESModule, []);
  outputs.set(LoaderType.Style, []);
  outputs.set(LoaderType.Script, []);
  outputs.set(LoaderType.Asset, []);

  for (const path of Object.keys(files)) {
    processFile(path, files, outputs);
  }

  return outputs;
}
