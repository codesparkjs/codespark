import type { InternalDep } from '_shared/types';
import { describe, expect, it } from 'vitest';

import { analyzeReferences } from './analyze-refs';

describe('analyzeReferences', () => {
  it('should return empty deps when no imports', () => {
    const deps = analyzeReferences('<div />', {});
    expect(deps).toHaveLength(0);
  });

  it('should return empty array on parse error', () => {
    const deps = analyzeReferences('invalid { syntax', {});
    expect(deps).toHaveLength(0);
  });

  it('should build internal dep from files map', () => {
    const code = "import { Button } from './button.tsx';\n<Button />";
    const deps = analyzeReferences(code, { './button.tsx': 'export const Button = () => <button />' });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('button.tsx');
  });

  it('should handle external deps', () => {
    const code = "import { useState } from 'react';\nuseState()";
    const deps = analyzeReferences(code, {});
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('react');
  });

  it('should handle URL imports', () => {
    const code = "import confetti from 'https://esm.sh/canvas-confetti@1.6.0';\nconfetti()";
    const deps = analyzeReferences(code, {});
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('https://esm.sh/canvas-confetti@1.6.0');
  });

  it('should resolve import without extension', () => {
    const code = "import { Button } from './button';\n<Button />";
    const deps = analyzeReferences(code, { './button.tsx': 'export const Button = () => <button />' });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('button.tsx');
  });

  it('should resolve import to folder index', () => {
    const code = "import { Button } from './button';\n<Button />";
    const deps = analyzeReferences(code, { './button/index.tsx': 'export const Button = () => <button />' });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('index.tsx');
  });

  it('should handle nested internal deps', () => {
    const code = "import { Button } from './button';\n<Button />";
    const files = {
      './button.tsx': "import { Icon } from './icon';\nexport const Button = () => <button><Icon /></button>",
      './icon.tsx': 'export const Icon = () => <span />'
    };
    const deps = analyzeReferences(code, files);
    expect(deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps[0].name).toBe('icon.tsx');
  });

  it('should handle circular deps by skipping visited', () => {
    const code = "import { A } from './a';\n<A />";
    const files = {
      './a.tsx': "import { B } from './b';\nexport const A = () => <B />",
      './b.tsx': "import { A } from './a';\nexport const B = () => <A />"
    };
    const deps = analyzeReferences(code, files);
    expect(deps).toHaveLength(1);
    expect(((deps[0] as InternalDep).deps[0] as InternalDep).deps).toHaveLength(0);
  });

  it('should skip type-only imports', () => {
    const code = "import type { Foo } from './foo';\n<div />";
    const deps = analyzeReferences(code, { './foo.tsx': 'export type Foo = string' });
    expect(deps).toHaveLength(0);
  });

  it('should skip unused imports', () => {
    const code = "import { Button } from './button';\n<div />";
    const deps = analyzeReferences(code, { './button.tsx': 'export const Button = () => <button />' });
    expect(deps).toHaveLength(0);
  });

  it('should skip type imports in nested deps', () => {
    const code = "import { Button } from './button';\n<Button />";
    const files = {
      './button.tsx': "import type { Props } from './types';\nexport const Button = () => <button />"
    };
    const deps = analyzeReferences(code, files);
    expect(deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps).toHaveLength(0);
  });

  it('should skip unused imports in nested deps', () => {
    const code = "import { Button } from './button';\n<Button />";
    const files = {
      './button.tsx': "import { Icon } from './icon';\nexport const Button = () => <button />"
    };
    const deps = analyzeReferences(code, files);
    expect(deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps).toHaveLength(0);
  });

  it('should use source as name when path has no slash', () => {
    const code = "import { Button } from 'button';\n<Button />";
    const deps = analyzeReferences(code, { button: 'export const Button = () => <button />' });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('button');
  });
});
