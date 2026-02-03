import type { Loader, LoaderContext, StyleLoaderOutput } from './types';
import { LoaderType } from './types';

export class CSSLoader implements Loader<LoaderType.Style> {
  readonly name = 'css-loader';
  readonly test = /\.css$/;

  constructor(private config?: { tailwind?: { enabled?: boolean; match?: RegExp } }) {}

  transform(source: string, ctx: LoaderContext): StyleLoaderOutput {
    const { enabled = true, match } = this.config?.tailwind || {};
    const isTailwind = match ? match.test(ctx.resourcePath) : ctx.resourcePath.endsWith('.tw.css');
    const imports: string[] = [];
    const importRegex = /@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?\s*;?/g;
    const content = source.replace(importRegex, (_, importPath) => {
      const resolved = ctx.resolve(importPath);
      if (resolved) imports.push(resolved);
      return '';
    });

    return {
      type: LoaderType.Style,
      content,
      imports,
      attributes: enabled && isTailwind ? { type: 'text/tailwindcss' } : {}
    };
  }
}
