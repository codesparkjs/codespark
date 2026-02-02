import DOMPurify from 'dompurify';
import { marked } from 'marked';

import type { AssetLoaderOutput, Loader } from './types';
import { LoaderType } from './types';

export class MarkdownLoader implements Loader<LoaderType.Asset> {
  readonly name = 'markdown-loader';
  readonly test = /\.md$/;

  transform(source: string): AssetLoaderOutput {
    const html = DOMPurify.sanitize(marked.parse(source, { async: false }));

    return { type: LoaderType.Asset, content: html };
  }
}
