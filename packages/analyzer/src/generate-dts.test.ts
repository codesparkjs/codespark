import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { generateDts } from './generate-dts';

describe('generateDts', () => {
  let tmpDir: string;
  let testFile: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dts-test-'));
    testFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(testFile, `export const foo = (x: number): string => x.toString();`);
    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true } }));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should generate dts for a simple file', () => {
    const result = generateDts(testFile, []);
    expect(result).toContain('export declare const foo');
    expect(result).toContain('(x: number) => string');
  });

  it('should cache results', () => {
    const first = generateDts(testFile, []);
    const second = generateDts(testFile, []);
    expect(first).toBe(second);
  });

  it('should exclude react from inlined libraries', () => {
    const result = generateDts(testFile, ['react', 'lodash']);
    expect(result).toBeDefined();
  });
});
