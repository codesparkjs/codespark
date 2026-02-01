import { describe, expect, it } from 'vitest';

import { OutputType } from '../loaders/types';
import type { OutputItem } from '../registry';
import { compile } from './compile';

function createOutputItem(path: string, content: string): OutputItem {
  return { path, content, externals: [], imports: new Map() };
}

describe('compile', () => {
  it('should return empty string when no assets', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.Asset, []);
    expect(compile(outputs)).toBe('');
  });

  it('should return content for single asset', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.Asset, [createOutputItem('./index.md', '<h1>Hello</h1>')]);
    expect(compile(outputs)).toBe('<h1>Hello</h1>');
  });

  it('should join multiple assets with newline', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.Asset, [createOutputItem('./a.md', '<h1>A</h1>'), createOutputItem('./b.md', '<h2>B</h2>')]);
    expect(compile(outputs)).toBe('<h1>A</h1>\n<h2>B</h2>');
  });

  it('should handle missing Asset key', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    expect(compile(outputs)).toBe('');
  });

  it('should ignore non-asset outputs', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.Asset, [createOutputItem('./index.md', '<p>content</p>')]);
    outputs.set(OutputType.ESModule, [createOutputItem('./index.ts', 'const x = 1')]);
    expect(compile(outputs)).toBe('<p>content</p>');
  });
});
