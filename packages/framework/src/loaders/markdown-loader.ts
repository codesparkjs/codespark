import DOMPurify from 'dompurify';
import { marked } from 'marked';

import type { Loader, LoaderContext, LoaderOutput } from './types';
import { OutputType } from './types';

export class MarkdownLoader implements Loader {
  readonly name = 'markdown-loader';
  readonly test = /\.md$/;
  readonly outputType = OutputType.Asset;

  transform(source: string, _ctx: LoaderContext): LoaderOutput {
    const html = DOMPurify.sanitize(marked.parse(source, { async: false }));

    return {
      type: OutputType.Asset,
      content: html,
      dependencies: [],
      externals: []
    };
  }
}
