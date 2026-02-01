import { describe, expect, it } from 'vitest';

import { OutputType } from '../loaders/types';
import type { OutputItem } from './analyze';
import { compile } from './compile';

function createOutputItem(path: string, content: string, imports = new Map<string, string>()): OutputItem {
  return { path, content, externals: [], imports };
}

describe('compile', () => {
  it('should return empty string when no modules', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.ESModule, []);
    expect(compile(outputs)).toBe('');
  });

  it('should return entry code for single module', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.ESModule, [createOutputItem('./index.tsx', 'const App = () => <div />')]);
    expect(compile(outputs)).toBe('const App = () => <div />');
  });

  it('should remove internal imports that resolve to blob URLs', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.ESModule, [createOutputItem('./index.tsx', "import { Button } from './button';\n<Button />", new Map([['./button', './button.tsx']])), createOutputItem('./button.tsx', 'export const Button = () => <button />')]);

    const result = compile(outputs);
    // The entry module should have the import replaced with blob URL
    expect(result).toContain('blob:');
    expect(result).toContain('<Button />');
  });

  it('should handle multiple internal deps', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.ESModule, [
      createOutputItem(
        './index.tsx',
        "import { Button } from './button';\nimport { Icon } from './icon';\n<><Button /><Icon /></>",
        new Map([
          ['./button', './button.tsx'],
          ['./icon', './icon.tsx']
        ])
      ),
      createOutputItem('./button.tsx', 'export const Button = () => <button />'),
      createOutputItem('./icon.tsx', 'export const Icon = () => <span />')
    ]);

    const result = compile(outputs);
    expect(result).toContain('<Button />');
    expect(result).toContain('<Icon />');
  });

  it('should preserve external imports', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.ESModule, [createOutputItem('./index.tsx', "import { useState } from 'react';\nuseState()")]);

    const result = compile(outputs);
    expect(result).toContain("import { useState } from 'react'");
  });

  it('should remove imports without blob URL mapping', () => {
    const outputs = new Map<OutputType, OutputItem[]>();
    outputs.set(OutputType.ESModule, [createOutputItem('./index.tsx', "import './styles.css';\n<div />", new Map([['./styles.css', './styles.css']]))]);

    const result = compile(outputs);
    expect(result).not.toContain("import './styles.css'");
    expect(result).toContain('<div />');
  });
});
