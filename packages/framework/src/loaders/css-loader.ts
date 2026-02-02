import type { Loader, LoaderContext, StyleLoaderOutput } from './types';
import { LoaderType } from './types';

export class CSSLoader implements Loader<LoaderType.Style> {
  readonly name = 'css-loader';
  readonly test = /\.css$/;

  transform(source: string, ctx: LoaderContext): StyleLoaderOutput {
    const imports: string[] = [];
    const importRegex = /@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?\s*;?/g;
    const content = source.replace(importRegex, (_, importPath) => {
      const resolved = ctx.resolve(importPath);
      if (resolved) imports.push(resolved);
      return '';
    });

    return { type: LoaderType.Style, content, imports };
  }
}
