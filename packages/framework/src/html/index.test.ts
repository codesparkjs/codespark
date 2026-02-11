import { describe, expect, it } from 'vitest';

import { LoaderType } from '../loaders/types';
import type { Output } from '../registry';
import { Framework } from './index';

const ENTRY = './index.html';

describe('Framework lite mode', () => {
  it('should wrap HTML fragment with full document structure', () => {
    const framework = new Framework({ liteMode: { enabled: true, htmlEntry: ENTRY } });
    framework.analyze({
      [ENTRY]: '<div id="app">Hello</div>',
      './index.js': 'console.log("hello")',
      './index.css': 'body { color: red; }'
    });

    const assets = framework.outputs.get(LoaderType.Asset) as Output<LoaderType.Asset>[];
    expect(assets).toHaveLength(1);
    expect(assets[0].content).toBe('<div id="app">Hello</div>');
  });

  it('should auto-include default script entry as ES module', () => {
    const framework = new Framework({ liteMode: { enabled: true, htmlEntry: ENTRY } });
    framework.analyze({
      [ENTRY]: '<div id="app"></div>',
      './index.js': 'console.log("hello")',
      './index.css': ''
    });

    const esModules = framework.outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
    expect(esModules).toHaveLength(1);
    expect(esModules[0].path).toBe('./index.js');
  });

  it('should auto-include default style entry', () => {
    const framework = new Framework({ liteMode: { enabled: true, htmlEntry: ENTRY } });
    framework.analyze({
      [ENTRY]: '<div id="app"></div>',
      './index.js': '',
      './index.css': 'body { margin: 0; }'
    });

    const styles = framework.outputs.get(LoaderType.Style) as Output<LoaderType.Style>[];
    expect(styles).toHaveLength(1);
    expect(styles[0].path).toBe('./index.css');
  });

  it('should use custom script and style entries', () => {
    const framework = new Framework({
      liteMode: {
        enabled: true,
        htmlEntry: ENTRY,
        scriptEntry: './main.ts',
        styleEntry: './styles.css'
      }
    });
    framework.analyze({
      [ENTRY]: '<div id="app"></div>',
      './main.ts': 'export const x = 1;',
      './styles.css': '.app { display: flex; }'
    });

    const esModules = framework.outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
    const styles = framework.outputs.get(LoaderType.Style) as Output<LoaderType.Style>[];

    expect(esModules).toHaveLength(1);
    expect(esModules[0].path).toBe('./main.ts');
    expect(styles).toHaveLength(1);
    expect(styles[0].path).toBe('./styles.css');
  });

  it('should handle empty HTML fragment', () => {
    const framework = new Framework({ liteMode: { enabled: true, htmlEntry: ENTRY } });
    framework.analyze({
      [ENTRY]: '',
      './index.js': 'console.log("hello")',
      './index.css': ''
    });

    const assets = framework.outputs.get(LoaderType.Asset) as Output<LoaderType.Asset>[];
    expect(assets).toHaveLength(0);
  });

  it('should handle missing entry file', () => {
    const framework = new Framework({ liteMode: { enabled: true, htmlEntry: ENTRY } });
    framework.analyze({
      './index.js': 'console.log("hello")',
      './index.css': ''
    });

    const esModules = framework.outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
    expect(esModules).toHaveLength(1);
  });

  it('should process script dependencies in lite mode', () => {
    const framework = new Framework({ liteMode: { enabled: true, htmlEntry: ENTRY } });
    framework.analyze({
      [ENTRY]: '<div id="app"></div>',
      './index.js': "import { helper } from './utils.js';\nhelper();",
      './utils.js': 'export const helper = () => {}',
      './index.css': ''
    });

    const esModules = framework.outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
    expect(esModules).toHaveLength(2);
    const paths = esModules.map(m => m.path);
    expect(paths).toContain('./index.js');
    expect(paths).toContain('./utils.js');
  });

  it('should not wrap HTML when liteMode is false', () => {
    const framework = new Framework({ liteMode: { enabled: false } });
    framework.analyze({
      [ENTRY]: '<div id="app">Hello</div>',
      './index.js': 'console.log("hello")',
      './index.css': ''
    });

    // Without liteMode, script/style entries are not auto-included
    const esModules = framework.outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
    expect(esModules).toHaveLength(0);
  });

  it('should not wrap HTML when liteMode is not specified', () => {
    const framework = new Framework();
    framework.analyze({
      [ENTRY]: '<div id="app">Hello</div>',
      './index.js': 'console.log("hello")',
      './index.css': ''
    });

    const esModules = framework.outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
    expect(esModules).toHaveLength(0);
  });
});

describe('Framework compile with external scripts', () => {
  it('should compile external URL ES module script with src attribute', () => {
    const framework = new Framework();
    framework.analyze({
      [ENTRY]: '<script type="module" src="https://esm.sh/tsx"></script>'
    });

    const result = framework.compile(ENTRY);
    expect(result).toContain('src=\\"https://esm.sh/tsx\\"');
    expect(result).toContain('type=\\"module\\"');
  });

  it('should compile external URL regular script with src attribute', () => {
    const framework = new Framework();
    framework.analyze({
      [ENTRY]: '<script src="https://cdn.example.com/lib.js"></script>'
    });

    const result = framework.compile(ENTRY);
    expect(result).toContain('src=\\"https://cdn.example.com/lib.js\\"');
  });

  it('should compile mixed local and external scripts', () => {
    const framework = new Framework();
    framework.analyze({
      [ENTRY]: `
        <script type="module" src="./app.js"></script>
        <script type="module" src="https://esm.sh/react"></script>
        <script src="https://cdn.example.com/lib.js"></script>
      `,
      './app.js': 'console.log("local")'
    });

    const result = framework.compile(ENTRY);
    expect(result).toContain('src=\\"https://esm.sh/react\\"');
    expect(result).toContain('src=\\"https://cdn.example.com/lib.js\\"');
    expect(result).toContain('console.log');
  });
});
