import { Framework as Base } from '@codespark/framework';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export class Framework extends Base {
  readonly name = 'markdown';
  readonly imports = {};

  analyze() {
    return [];
  }

  compile(entry: string, files: Record<string, string>) {
    const content = files[entry] ?? '';
    const html = DOMPurify.sanitize(marked.parse(content, { async: false }));

    return `
    document.getElementById('root').innerHTML = ${JSON.stringify(html)};
    window.__render_complete__?.();
    window.__next__?.();
    `;
  }
}

export const markdown = new Framework();
