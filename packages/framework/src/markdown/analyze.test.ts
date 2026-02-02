import { describe, expect, it, vi } from 'vitest';

import { LoaderType } from '../loaders/types';
import { analyze } from './analyze';

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html
  }
}));

const ENTRY = './index.md';

describe('analyze', () => {
  it('should return empty outputs when entry file not found', () => {
    const outputs = analyze(ENTRY, {});
    const assets = outputs.get(LoaderType.Asset);
    expect(assets).toHaveLength(0);
  });

  it('should process single markdown file', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '# Hello' });
    const assets = outputs.get(LoaderType.Asset)!;
    expect(assets).toHaveLength(1);
    expect(assets[0].path).toBe(ENTRY);
    expect(assets[0].content).toContain('<h1>Hello</h1>');
  });

  it('should convert markdown to HTML', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '**bold** and *italic*' });
    const assets = outputs.get(LoaderType.Asset)!;
    expect(assets[0].content).toContain('<strong>bold</strong>');
    expect(assets[0].content).toContain('<em>italic</em>');
  });

  it('should handle code blocks', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '```js\nconst x = 1;\n```' });
    const assets = outputs.get(LoaderType.Asset)!;
    expect(assets[0].content).toContain('<pre><code');
    expect(assets[0].content).toContain('const x = 1;');
  });

  it('should handle lists', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '- item1\n- item2' });
    const assets = outputs.get(LoaderType.Asset)!;
    expect(assets[0].content).toContain('<ul>');
    expect(assets[0].content).toContain('<li>item1</li>');
    expect(assets[0].content).toContain('<li>item2</li>');
  });

  it('should skip files without matching loader', () => {
    const outputs = analyze('./index.tsx', { './index.tsx': 'const x = 1' });
    const assets = outputs.get(LoaderType.Asset);
    expect(assets).toHaveLength(0);
  });

  it('should not revisit already visited files', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '# Test' });
    const assets = outputs.get(LoaderType.Asset)!;
    expect(assets).toHaveLength(1);
  });
});
