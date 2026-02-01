import type { Dep } from '_shared/types';
import { Framework as Base } from '@codespark/framework';

import { MarkdownLoader } from '../loaders/markdown-loader';
import type { Loader, LoaderOutput } from '../loaders/types';
import { OutputType } from '../loaders/types';

interface CompileContext {
  files: Record<string, string>;
  visited: Set<string>;
  outputs: Map<OutputType, { path: string; content: string }[]>;
}

export class Framework extends Base {
  readonly name = 'markdown';
  readonly imports = {};

  private loaders: Loader[] = [];

  constructor() {
    super();
    this.loaders = [new MarkdownLoader()];
  }

  analyze(_entry: string, _files: Record<string, string>): Dep[] {
    return [];
  }

  compile(entry: string, files: Record<string, string>): string {
    const ctx: CompileContext = {
      files,
      visited: new Set(),
      outputs: new Map()
    };

    Object.values(OutputType).forEach(type => {
      ctx.outputs.set(type, []);
    });

    this.processFile(entry, ctx);

    return this.generateFinalCode(ctx);
  }

  private matchLoader(path: string): Loader | null {
    return this.loaders.find(l => l.test.test(path)) ?? null;
  }

  private processFile(path: string, ctx: CompileContext): LoaderOutput | null {
    if (ctx.visited.has(path)) return null;
    ctx.visited.add(path);

    const loader = this.matchLoader(path);
    if (!loader) return null;

    const source = ctx.files[path];
    if (source === undefined) return null;

    const output = loader.transform(source, {
      resourcePath: path,
      getSource: p => ctx.files[p],
      resolve: () => null
    });

    ctx.outputs.get(output.type)!.push({ path, content: output.content });

    for (const dep of output.dependencies) {
      this.processFile(dep, ctx);
    }

    return output;
  }

  private generateFinalCode(ctx: CompileContext): string {
    const assets = ctx.outputs.get(OutputType.Asset) || [];
    const html = assets.map(a => a.content).join('\n');

    return this.createBuilder().setHTML(JSON.stringify(html)).done();
  }
}

export const markdown = new Framework();
