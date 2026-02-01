import type { Loader, LoaderContext, LoaderOutput } from './types';
import { OutputType } from './types';

export class CSSLoader implements Loader {
  readonly name = 'css-loader';
  readonly test = /\.css$/;
  readonly outputType = OutputType.Style;

  transform(source: string, ctx: LoaderContext): LoaderOutput {
    const dependencies: string[] = [];
    const importRegex = /@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?\s*;?/g;
    const content = source.replace(importRegex, (_, importPath) => {
      const resolved = ctx.resolve(importPath);
      if (resolved) dependencies.push(resolved);
      return '';
    });

    return {
      type: OutputType.Style,
      content,
      dependencies,
      externals: []
    };
  }
}
