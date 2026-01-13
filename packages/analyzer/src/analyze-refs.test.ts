import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeReferences } from './analyze-refs';

const fixturesDir = path.resolve(__dirname, '__fixtures__');

describe('analyzeReferences', () => {
  it('should return empty deps when no files', () => {
    const code = 'const TestComp = () => <div />;\n<TestComp />';
    const deps = analyzeReferences(code, {});
    expect(deps).toHaveLength(0);
  });

  it('should build deps from files map', () => {
    const code = '<Button />';
    const buttonCode = fs.readFileSync(path.join(fixturesDir, 'button.tsx'), 'utf-8');
    const deps = analyzeReferences(code, { './button': buttonCode });
    expect(deps).toHaveLength(0);
  });

  it('should handle empty inputs', () => {
    const deps = analyzeReferences('<div />', {});
    expect(deps).toHaveLength(0);
  });

  it('should handle external deps in code', () => {
    const code = "import { useState } from 'react';\nuseState()";
    const deps = analyzeReferences(code, {});
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('react');
  });

  it('should handle external deps via URLs in code', () => {
    const code = "import confetti from 'https://esm.sh/canvas-confetti@1.6.0';\nconfetti()";
    const deps = analyzeReferences(code, {});
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('https://esm.sh/canvas-confetti@1.6.0');
  });
});
