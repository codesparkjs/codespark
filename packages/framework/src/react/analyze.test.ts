import type { InternalDep } from '_shared/types';
import { describe, expect, it } from 'vitest';

import { analyze } from './analyze';

const ENTRY = './index.tsx';

describe('analyze', () => {
  it('should return empty deps when no imports', () => {
    const deps = analyze(ENTRY, { [ENTRY]: '<div />' });
    expect(deps).toHaveLength(0);
  });

  it('should return empty array on parse error', () => {
    const deps = analyze(ENTRY, { [ENTRY]: 'invalid { syntax' });
    expect(deps).toHaveLength(0);
  });

  it('should build internal dep from files map', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { Button } from './button.tsx';\n<Button />",
      './button.tsx': 'export const Button = () => <button />'
    });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('button.tsx');
  });

  it('should handle external deps', () => {
    const deps = analyze(ENTRY, { [ENTRY]: "import { useState } from 'react';\nuseState()" });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('react');
  });

  it('should handle URL imports', () => {
    const deps = analyze(ENTRY, { [ENTRY]: "import confetti from 'https://esm.sh/canvas-confetti@1.6.0';\nconfetti()" });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('https://esm.sh/canvas-confetti@1.6.0');
  });

  it('should resolve import without extension', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { Button } from './button';\n<Button />",
      './button.tsx': 'export const Button = () => <button />'
    });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('button.tsx');
  });

  it('should resolve import to folder index', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { Button } from './button';\n<Button />",
      './button/index.tsx': 'export const Button = () => <button />'
    });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('index.tsx');
  });

  it('should handle nested internal deps', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { Button } from './button';\n<Button />",
      './button.tsx': "import { Icon } from './icon';\nexport const Button = () => <button><Icon /></button>",
      './icon.tsx': 'export const Icon = () => <span />'
    });
    expect(deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps[0].name).toBe('icon.tsx');
  });

  it('should handle circular deps by skipping visited', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { A } from './a';\n<A />",
      './a.tsx': "import { B } from './b';\nexport const A = () => <B />",
      './b.tsx': "import { A } from './a';\nexport const B = () => <A />"
    });
    expect(deps).toHaveLength(1);
    expect(((deps[0] as InternalDep).deps[0] as InternalDep).deps).toHaveLength(0);
  });

  it('should skip type-only imports', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import type { Foo } from './foo';\n<div />",
      './foo.tsx': 'export type Foo = string'
    });
    expect(deps).toHaveLength(0);
  });

  it('should skip unused imports', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { Button } from './button';\n<div />",
      './button.tsx': 'export const Button = () => <button />'
    });
    expect(deps).toHaveLength(0);
  });

  it('should skip type imports in nested deps', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { Button } from './button';\n<Button />",
      './button.tsx': "import type { Props } from './types';\nexport const Button = () => <button />"
    });
    expect(deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps).toHaveLength(0);
  });

  it('should skip unused imports in nested deps', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { Button } from './button';\n<Button />",
      './button.tsx': "import { Icon } from './icon';\nexport const Button = () => <button />"
    });
    expect(deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps).toHaveLength(0);
  });

  it('should use source as name when path has no slash', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { Button } from 'button';\n<Button />",
      button: 'export const Button = () => <button />'
    });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('button');
  });

  it('should resolve relative paths in nested deps', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { a } from './src/components/ui/button';\na",
      './src/components/ui/button.tsx': "import { cn } from '../../lib/utils';\nexport const a = cn;",
      './src/lib/utils.ts': "export const cn = '2'"
    });
    expect(deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps).toHaveLength(1);
    expect((deps[0] as InternalDep).deps[0].name).toBe('utils.ts');
  });

  it('should handle CSS side-effect imports', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import './styles.css';\n<div />",
      './styles.css': '.btn { color: red; }'
    });
    expect(deps).toHaveLength(1);
    expect((deps[0] as InternalDep).alias).toBe('./styles.css');
    expect((deps[0] as InternalDep).code).toBe('.btn { color: red; }');
    expect((deps[0] as InternalDep).name).toBe('');
    expect((deps[0] as InternalDep).deps).toHaveLength(0);
  });

  it('should not merge subpath imports from same package', () => {
    const deps = analyze(ENTRY, {
      [ENTRY]: "import { registerFramework } from '@codespark/framework';\nimport { markdown } from '@codespark/framework/markdown';\nimport { Codespark } from '@codespark/react';\nregisterFramework(); markdown(); Codespark;"
    });
    expect(deps).toHaveLength(3);
    expect(deps.map(d => d.name).sort()).toEqual(['@codespark/framework', '@codespark/framework/markdown', '@codespark/react']);
  });
});
