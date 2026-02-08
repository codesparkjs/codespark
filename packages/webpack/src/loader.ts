import path from 'node:path';

import type { LoaderDefinitionFunction } from 'webpack';

import { transformJsx } from './transform-jsx';

export interface LoaderOptions {
  methods?: string[];
  importSource?: string[];
}

const codesparkLoader: LoaderDefinitionFunction<LoaderOptions> = function (source) {
  const id = this.resourcePath;

  if (!['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(id))) {
    return source;
  }

  // Read original source from disk to ensure we get untransformed code.
  // Bundlers like Turbopack may transform the source before passing it
  // to loaders, making the `source` parameter unusable for AST analysis.
  const { methods, importSource } = this.getOptions();
  const transformed = transformJsx(source, id, { methods, importSource });

  return transformed ?? source;
};

export default codesparkLoader;
