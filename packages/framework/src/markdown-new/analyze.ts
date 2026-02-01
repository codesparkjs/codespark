import { type Loader, OutputType } from '../loaders/types';
import type { OutputItem } from '../registry';

interface AnalyzeContext {
  files: Record<string, string>;
  loaders: Loader[];
  outputs: Map<OutputType, OutputItem[]>;
}

function matchLoader(loaders: Loader[], path: string) {
  return loaders.find(l => l.test.test(path)) ?? null;
}

function processFile(path: string, ctx: AnalyzeContext, visited: Set<string>) {
  if (visited.has(path)) return;
  visited.add(path);

  const source = ctx.files[path];
  if (source === undefined) return;

  const loader = matchLoader(ctx.loaders, path);
  if (!loader) return;

  const output = loader.transform(source, {
    resourcePath: path,
    getSource: p => ctx.files[p],
    resolve: () => null
  });

  ctx.outputs.get(output.type)?.push({ path, content: output.content, externals: [], imports: new Map() });

  for (const depPath of output.dependencies) {
    processFile(depPath, ctx, visited);
  }
}

export function analyze(entry: string, files: Record<string, string>, loaders: Loader[]) {
  const outputs = new Map<OutputType, OutputItem[]>();
  for (const type of Object.values(OutputType)) {
    outputs.set(type, []);
  }

  const ctx: AnalyzeContext = { files, loaders, outputs };
  const visited = new Set<string>();

  processFile(entry, ctx, visited);

  return outputs;
}
