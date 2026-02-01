import { type Loader, OutputType } from '../loaders/types';
import type { OutputItem } from '../registry';

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'] as const;

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

  const imports = new Map<string, string>();
  const output = loader.transform(source, {
    resourcePath: path,
    getSource: p => ctx.files[p],
    resolve: src => {
      const resolved = resolve(src, path, ctx.files);
      if (resolved) imports.set(src, resolved);
      return resolved;
    }
  });

  ctx.outputs.get(output.type)?.push({ path, content: output.content, externals: output.externals, imports });

  for (const depPath of output.dependencies) {
    processFile(depPath, ctx, visited);
  }
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
