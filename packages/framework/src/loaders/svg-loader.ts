import type { AssetLoaderOutput, Loader } from './types';
import { LoaderType } from './types';

export class SVGLoader implements Loader<LoaderType.Asset> {
  readonly name = 'svg-loader';
  readonly test = /\.svg$/;

  transform(source: string): AssetLoaderOutput {
    return { type: LoaderType.Asset, content: source };
  }
}
