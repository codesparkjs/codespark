import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectDependencies } from './collect-deps';

const fixturesDir = path.resolve(__dirname, '__fixtures__');

describe('collectDependencies', () => {
  it('should collect internal deps and locals', () => {
    const code = '<App />';
    const result = collectDependencies(code, path.join(fixturesDir, 'with-internal.tsx'));
    expect(result.entry.code).toBe(code);
    expect(result.entry.locals).toHaveLength(1);
    expect(result.files['./cd-button']).toContain('export const Button');
  });

  it('should collect locals from host file', () => {
    const code = '<TestComp />';
    const result = collectDependencies(code, path.join(fixturesDir, 'host.tsx'));
    expect(result.entry.locals).toHaveLength(2);
    expect(result.entry.locals[0]).toContain('MyButton');
    expect(result.entry.locals[1]).toContain('TestComp');
    expect(Object.keys(result.files)).toHaveLength(0);
  });

  it('should return empty when code uses undefined component', () => {
    const code = '<Unknown />';
    const result = collectDependencies(code, path.join(fixturesDir, 'with-internal.tsx'));
    expect(result.entry.locals).toHaveLength(0);
    expect(Object.keys(result.files)).toHaveLength(0);
  });

  it('should collect external imports', () => {
    const code = '<Counter />';
    const result = collectDependencies(code, path.join(fixturesDir, 'with-external.tsx'));
    expect(result.entry.imports).toHaveLength(1);
    expect(result.entry.imports[0]).toBe("import { useState } from 'react';");
  });

  it('should filter unused specifiers from external imports', () => {
    const code = '<Counter />';
    const result = collectDependencies(code, path.join(fixturesDir, 'with-multi-imports.tsx'));
    expect(result.entry.imports).toHaveLength(1);
    expect(result.entry.imports[0]).toBe("import { useState } from 'react';");
    expect(result.entry.imports[0]).not.toContain('useMemo');
    expect(result.entry.imports[0]).not.toContain('useCallback');
  });

  it('should return empty result on parse error', () => {
    const code = 'invalid { syntax';
    const result = collectDependencies(code, path.join(fixturesDir, 'host.tsx'));
    expect(result.entry.locals).toHaveLength(0);
    expect(result.entry.imports).toHaveLength(0);
  });

  it('should convert alias import to relative path in files and imports', () => {
    const code = 'App';
    const result = collectDependencies(code, path.join(fixturesDir, 'with-alias.tsx'));
    expect(result.entry.locals).toHaveLength(1);
    expect(result.entry.imports).toHaveLength(1);
    expect(result.entry.imports[0]).toBe("import ButtonDefault from './button';");
    expect(result.files['./button.tsx']).toContain('export default function Button');
    expect(result.files['@/button']).toBeUndefined();
  });

  it('should resolve import with explicit extension', () => {
    const code = '<App />';
    const result = collectDependencies(code, path.join(fixturesDir, 'with-extension.tsx'));
    expect(result.entry.locals).toHaveLength(1);
    expect(result.files['./cd-button.tsx']).toContain('export const Button');
  });

  it('should rewrite alias imports in nested files', () => {
    const code = 'App';
    const result = collectDependencies(code, path.join(fixturesDir, 'with-alias-nested.tsx'));
    // alias-nested.tsx imports @/cd-button → should be collected with relative key
    expect(result.files['./alias-nested.tsx']).toBeDefined();
    expect(result.files['./cd-button.tsx']).toBeDefined();
    // alias import inside alias-nested.tsx should be rewritten to relative path
    expect(result.files['./alias-nested.tsx']).not.toContain('@/cd-button');
    expect(result.files['./alias-nested.tsx']).toContain('./cd-button');
  });
});
