import { availablePresets } from '@babel/standalone';
import { describe, expect, it } from 'vitest';

import { CSSLoader } from '../loaders/css-loader';
import { ESLoader } from '../loaders/es-loader';
import { OutputType } from '../loaders/types';
import { analyze, resolve } from './analyze';

const ENTRY = './index.tsx';

const esLoader = new ESLoader({
  jsxPreset: [availablePresets.react, { runtime: 'automatic' }],
  isTSX: true
});
const cssLoader = new CSSLoader();
const loaders = [esLoader, cssLoader];

describe('resolve', () => {
  it('should return null for non-relative paths', () => {
    expect(resolve('react', './index.tsx', {})).toBeNull();
    expect(resolve('@scope/pkg', './index.tsx', {})).toBeNull();
  });

  it('should resolve exact path', () => {
    const files = { './button.tsx': '' };
    expect(resolve('./button.tsx', './index.tsx', files)).toBe('./button.tsx');
  });

  it('should resolve path with extension', () => {
    const files = { './button.tsx': '' };
    expect(resolve('./button', './index.tsx', files)).toBe('./button.tsx');
  });

  it('should resolve folder index', () => {
    const files = { './button/index.tsx': '' };
    expect(resolve('./button', './index.tsx', files)).toBe('./button/index.tsx');
  });

  it('should resolve relative paths with ..', () => {
    const files = { './lib/utils.ts': '' };
    expect(resolve('../lib/utils', './src/button.tsx', files)).toBe('./lib/utils.ts');
  });

  it('should return null when file not found', () => {
    expect(resolve('./missing', './index.tsx', {})).toBeNull();
  });
});

describe('analyze', () => {
  it('should return empty outputs when no imports', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: '<div />' }, loaders);
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(1);
    expect(esModules[0].externals).toHaveLength(0);
    expect(esModules[0].imports.size).toBe(0);
  });

  it('should handle external deps', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: "import { useState } from 'react';\nuseState()" }, loaders);
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(1);
    expect(esModules[0].externals).toHaveLength(1);
    expect(esModules[0].externals[0].name).toBe('react');
  });

  it('should handle URL imports', () => {
    const outputs = analyze(ENTRY, { [ENTRY]: "import confetti from 'https://esm.sh/canvas-confetti@1.6.0';\nconfetti()" }, loaders);
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules[0].externals).toHaveLength(1);
    expect(esModules[0].externals[0].name).toBe('https://esm.sh/canvas-confetti@1.6.0');
  });

  it('should build internal dep from files map', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { Button } from './button.tsx';\n<Button />",
        './button.tsx': 'export const Button = () => <button />'
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(2);
    expect(esModules[0].imports.get('./button.tsx')).toBe('./button.tsx');
  });

  it('should resolve import without extension', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { Button } from './button';\n<Button />",
        './button.tsx': 'export const Button = () => <button />'
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(2);
    expect(esModules[0].imports.get('./button')).toBe('./button.tsx');
  });

  it('should resolve import to folder index', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { Button } from './button';\n<Button />",
        './button/index.tsx': 'export const Button = () => <button />'
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(2);
    expect(esModules[0].imports.get('./button')).toBe('./button/index.tsx');
  });

  it('should handle nested internal deps', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { Button } from './button';\n<Button />",
        './button.tsx': "import { Icon } from './icon';\nexport const Button = () => <button><Icon /></button>",
        './icon.tsx': 'export const Icon = () => <span />'
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(3);
    const paths = esModules.map(m => m.path);
    expect(paths).toContain('./index.tsx');
    expect(paths).toContain('./button.tsx');
    expect(paths).toContain('./icon.tsx');
  });

  it('should handle circular deps by skipping visited', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { A } from './a';\n<A />",
        './a.tsx': "import { B } from './b';\nexport const A = () => <B />",
        './b.tsx': "import { A } from './a';\nexport const B = () => <A />"
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(3);
  });

  it('should skip type-only imports', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import type { Foo } from './foo';\n<div />",
        './foo.tsx': 'export type Foo = string'
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(1);
  });

  it('should skip unused imports', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { Button } from './button';\n<div />",
        './button.tsx': 'export const Button = () => <button />'
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(1);
  });

  it('should handle CSS side-effect imports', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import './styles.css';\n<div />",
        './styles.css': '.btn { color: red; }'
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    const styles = outputs.get(OutputType.Style)!;
    expect(esModules).toHaveLength(1);
    expect(styles).toHaveLength(1);
    expect(styles[0].content).toBe('.btn { color: red; }');
  });

  it('should resolve relative paths in nested deps', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { a } from './src/components/ui/button';\na",
        './src/components/ui/button.tsx': "import { cn } from '../../lib/utils';\nexport const a = cn;",
        './src/lib/utils.ts': "export const cn = '2'"
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(3);
    const paths = esModules.map(m => m.path);
    expect(paths).toContain('./src/lib/utils.ts');
  });

  it('should not merge subpath imports from same package', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { registerFramework } from '@codespark/framework';\nimport { markdown } from '@codespark/framework/markdown';\nimport { Codespark } from '@codespark/react';\nregisterFramework(); markdown(); Codespark;"
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules[0].externals).toHaveLength(3);
    expect(esModules[0].externals.map(d => d.name).sort()).toEqual(['@codespark/framework', '@codespark/framework/markdown', '@codespark/react']);
  });

  it('should track named imports in externals', () => {
    const outputs = analyze(
      ENTRY,
      {
        [ENTRY]: "import { useState, useEffect } from 'react';\nuseState(); useEffect();"
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules[0].externals[0].imported).toContain('useState');
    expect(esModules[0].externals[0].imported).toContain('useEffect');
  });

  it('should handle files without matching loader', () => {
    const outputs = analyze(
      './data.json',
      {
        './data.json': '{"key": "value"}'
      },
      loaders
    );
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(0);
  });

  it('should handle missing entry file', () => {
    const outputs = analyze(ENTRY, {}, loaders);
    const esModules = outputs.get(OutputType.ESModule)!;
    expect(esModules).toHaveLength(0);
  });

  it('should handle CSS @import', () => {
    const outputs = analyze(
      './styles.css',
      {
        './styles.css': "@import './base.css';\n.btn { color: red; }",
        './base.css': 'body { margin: 0; }'
      },
      [cssLoader]
    );
    const styles = outputs.get(OutputType.Style)!;
    expect(styles).toHaveLength(2);
  });
});
