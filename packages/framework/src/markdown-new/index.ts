import { Framework as Base } from '@codespark/framework';

import { MarkdownLoader } from '../loaders/markdown-loader';
import { type Loader, OutputType } from '../loaders/types';
import type { OutputItem } from '../registry';
import { analyze } from './analyze';
import { compile } from './compile';

export class Framework extends Base {
  readonly name = 'markdown';
  readonly imports = {};

  private loaders: Loader[] = [];

  constructor() {
    super();
    this.loaders = [new MarkdownLoader()];
  }

  analyze(entry: string, files: Record<string, string>) {
    return analyze(entry, files, this.loaders);
  }

  compile(outputs: Map<OutputType, OutputItem[]>) {
    const html = compile(outputs);
    return this.createBuilder().setHTML(JSON.stringify(html)).done();
  }
}

export const markdown = new Framework();
