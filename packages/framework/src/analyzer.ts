import { Loader, LoaderType } from './loaders/types';
import type { Output, Outputs } from './registry';

export class Analyzer {
  outputs: Outputs;

  constructor(protected loaders: Loader<any>[]) {
    const outputs: Outputs = new Map();
    outputs.set(LoaderType.ESModule, []);
    outputs.set(LoaderType.Style, []);
    outputs.set(LoaderType.Script, []);
    outputs.set(LoaderType.Asset, []);

    this.outputs = outputs;
  }

  protected matchLoader(path: string) {
    return this.loaders.find(loader => loader.test.test(path)) ?? null;
  }

  protected getOutputArray<T extends LoaderType>(type: T) {
    return this.outputs.get(type) as Output<T>[];
  }
}
