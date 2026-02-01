import { describe, expect, it } from 'vitest';

import { MarkdownLoader } from '../loaders/markdown-loader';
import { OutputType } from '../loaders/types';
import { analyze } from './analyze';

const ENTRY = './index.md';
const loaders = [new MarkdownLoader()];

describe('analyze', () => {
  it('should return empty outputs when entry file not found', () => {
    const outputs = analyze(ENTRY, {}, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets).toHaveLength(0);
  });

  it('should process single markdown file', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '# Hello' }, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets).toHaveLength(1);
    expect(assets[0].path).toBe(ENTRY);
    expect(assets[0].content).toContain('<h1>Hello</h1>');
  });

  it('should convert markdown to HTML', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '**bold** and *italic*' }, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets[0].content).toContain('<strong>bold</strong>');
    expect(assets[0].content).toContain('<em>italic</em>');
  });

  it('should handle code blocks', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '```js\nconst x = 1;\n```' }, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets[0].content).toContain('<code>');
    expect(assets[0].content).toContain('const x = 1;');
  });

  it('should handle lists', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '- item1\n- item2' }, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets[0].content).toContain('<ul>');
    expect(assets[0].content).toContain('<li>item1</li>');
    expect(assets[0].content).toContain('<li>item2</li>');
  });

  it('should skip files without matching loader', () => {
    const outputs = analyze('./index.tsx', { './index.tsx': 'const x = 1' }, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets).toHaveLength(0);
  });

  it('should not revisit already visited files', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '# Test' }, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets).toHaveLength(1);
  });

  it('should set externals to empty array', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '# Hello' }, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets[0].externals).toEqual([]);
  });

  it('should set imports to empty map', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '# Hello' }, loaders);
    const assets = outputs.get(OutputType.Asset)!;
    expect(assets[0].imports.size).toBe(0);
  });
});
