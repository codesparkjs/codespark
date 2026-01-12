import { describe, expect, it } from 'vitest';

import { buildImportMap, collectIdentifiers, getDefinedNames, parseCode } from './shared';

describe('parseCode', () => {
  it('should parse JSX code', () => {
    const ast = parseCode('<div>hello</div>');
    expect(ast).toHaveLength(1);
    expect(ast[0].type).toBe('ExpressionStatement');
  });

  it('should parse TypeScript code', () => {
    const ast = parseCode('const x: number = 1;');
    expect(ast).toHaveLength(1);
    expect(ast[0].type).toBe('VariableDeclaration');
  });

  it('should parse imports', () => {
    const ast = parseCode("import { useState } from 'react';");
    expect(ast).toHaveLength(1);
    expect(ast[0].type).toBe('ImportDeclaration');
  });
});

describe('collectIdentifiers', () => {
  it('should collect identifiers from code', () => {
    const ast = parseCode('const x = foo + bar;');
    const ids = collectIdentifiers(ast);
    expect(ids.has('x')).toBe(true);
    expect(ids.has('foo')).toBe(true);
    expect(ids.has('bar')).toBe(true);
  });

  it('should collect JSX identifiers', () => {
    const ast = parseCode('<MyComponent prop={value} />');
    const ids = collectIdentifiers(ast);
    expect(ids.has('MyComponent')).toBe(true);
    expect(ids.has('value')).toBe(true);
  });
});

describe('buildImportMap', () => {
  it('should map imported names to sources', () => {
    const ast = parseCode("import { useState, useEffect } from 'react';");
    const imports = ast.filter((n): n is import('@babel/types').ImportDeclaration => n.type === 'ImportDeclaration');
    const map = buildImportMap(imports);
    expect(map.get('useState')).toBe('react');
    expect(map.get('useEffect')).toBe('react');
  });

  it('should skip type imports', () => {
    const ast = parseCode("import type { FC } from 'react';");
    const imports = ast.filter((n): n is import('@babel/types').ImportDeclaration => n.type === 'ImportDeclaration');
    const map = buildImportMap(imports);
    expect(map.size).toBe(0);
  });
});

describe('getDefinedNames', () => {
  it('should get variable names', () => {
    const ast = parseCode('const foo = 1;');
    expect(getDefinedNames(ast[0])).toEqual(['foo']);
  });

  it('should get function names', () => {
    const ast = parseCode('function myFunc() {}');
    expect(getDefinedNames(ast[0])).toEqual(['myFunc']);
  });

  it('should get class names', () => {
    const ast = parseCode('class MyClass {}');
    expect(getDefinedNames(ast[0])).toEqual(['MyClass']);
  });
});
