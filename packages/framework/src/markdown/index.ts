import { Framework as Base } from '@codespark/framework';

import { LoaderType } from '../loaders/types';
import type { Outputs } from '../registry';
import { analyze } from './analyze';

export class Framework extends Base {
  readonly name = 'markdown';
  readonly imports = {};
  outputs: Outputs = new Map();

  analyze(files: Record<string, string>) {
    this.outputs = analyze(files);
  }

  compile(entry: string) {
    const assets = this.getOutput(LoaderType.Asset);
    const entryAsset = assets.find(a => a.path === entry);

    return this.createBuilder()
      .setHTML(JSON.stringify(entryAsset?.content ?? ''))
      .done();
  }
}

export const markdown = new Framework();
