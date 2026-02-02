import { Framework as Base } from '@codespark/framework';

import { LoaderType } from '../loaders/types';
import type { Outputs } from '../registry';
import { analyze } from './analyze';

export class Framework extends Base {
  readonly name = 'markdown';
  readonly imports = {};
  outputs: Outputs = new Map();

  analyze(entry: string, files: Record<string, string>) {
    this.outputs = analyze(entry, files);
  }

  compile() {
    const assets = this.getOutput(LoaderType.Asset);

    return this.createBuilder()
      .setHTML(JSON.stringify(assets.map(({ content }) => content).join('')))
      .done();
  }
}

export const markdown = new Framework();
