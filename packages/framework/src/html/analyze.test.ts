import { describe, expect, it } from 'vitest';

import { LoaderType } from '../loaders/types';
import type { Output } from '../registry';
import { analyze } from './analyze';

const ENTRY = './index.html';

describe('analyze', () => {
  it('should return empty outputs when no files', () => {
    const outputs = analyze({});
    expect(outputs.get(LoaderType.ESModule)).toHaveLength(0);
    expect(outputs.get(LoaderType.Style)).toHaveLength(0);
    expect(outputs.get(LoaderType.Script)).toHaveLength(0);
    expect(outputs.get(LoaderType.Asset)).toHaveLength(0);
  });

  it('should return empty outputs for empty HTML', () => {
    const outputs = analyze({ [ENTRY]: '' });
    expect(outputs.get(LoaderType.ESModule)).toHaveLength(0);
    expect(outputs.get(LoaderType.Style)).toHaveLength(0);
    expect(outputs.get(LoaderType.Script)).toHaveLength(0);
    expect(outputs.get(LoaderType.Asset)).toHaveLength(0);
  });

  describe('script tags', () => {
    it('should handle external ES module script', () => {
      const outputs = analyze({
        [ENTRY]: '<script type="module" src="./app.js"></script>',
        './app.js': 'console.log("hello")'
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      expect(esModules).toHaveLength(1);
      expect(esModules[0].path).toBe('./app.js');
    });

    it('should handle inline ES module script', () => {
      const outputs = analyze({
        [ENTRY]: '<script type="module">console.log("inline")</script>'
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      expect(esModules).toHaveLength(1);
      expect(esModules[0].path).toContain('#inline-module-');
    });

    it('should handle external regular script', () => {
      const outputs = analyze({
        [ENTRY]: '<script src="./legacy.js"></script>',
        './legacy.js': 'var x = 1;'
      });
      const scripts = outputs.get(LoaderType.Script) as Output<LoaderType.Script>[];
      expect(scripts).toHaveLength(1);
      expect(scripts[0].path).toBe('./legacy.js');
      expect(scripts[0].content).toBe('var x = 1;');
    });

    it('should handle inline regular script', () => {
      const outputs = analyze({
        [ENTRY]: '<script>var x = 1;</script>'
      });
      const scripts = outputs.get(LoaderType.Script) as Output<LoaderType.Script>[];
      expect(scripts).toHaveLength(1);
      expect(scripts[0].path).toContain('#inline-script-');
      expect(scripts[0].content).toBe('var x = 1;');
    });

    it('should handle multiple scripts', () => {
      const outputs = analyze({
        [ENTRY]: `
          <script type="module" src="./app.js"></script>
          <script src="./legacy.js"></script>
          <script>var inline = true;</script>
        `,
        './app.js': 'export const a = 1;',
        './legacy.js': 'var b = 2;'
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      const scripts = outputs.get(LoaderType.Script) as Output<LoaderType.Script>[];
      expect(esModules).toHaveLength(1);
      expect(scripts).toHaveLength(2);
    });

    it('should handle external URL ES module script', () => {
      const outputs = analyze({
        [ENTRY]: '<script type="module" src="https://esm.sh/tsx"></script>'
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      const scripts = outputs.get(LoaderType.Script) as Output<LoaderType.Script>[];
      expect(esModules).toHaveLength(0);
      expect(scripts).toHaveLength(1);
      expect(scripts[0].src).toBe('https://esm.sh/tsx');
      expect(scripts[0].attributes?.type).toBe('module');
      expect(scripts[0].content).toBe('');
    });

    it('should handle external URL regular script', () => {
      const outputs = analyze({
        [ENTRY]: '<script src="https://cdn.example.com/lib.js"></script>'
      });
      const scripts = outputs.get(LoaderType.Script) as Output<LoaderType.Script>[];
      expect(scripts).toHaveLength(1);
      expect(scripts[0].src).toBe('https://cdn.example.com/lib.js');
      expect(scripts[0].content).toBe('');
    });

    it('should handle protocol-relative URL script', () => {
      const outputs = analyze({
        [ENTRY]: '<script src="//cdn.example.com/lib.js"></script>'
      });
      const scripts = outputs.get(LoaderType.Script) as Output<LoaderType.Script>[];
      expect(scripts).toHaveLength(1);
      expect(scripts[0].src).toBe('//cdn.example.com/lib.js');
    });

    it('should handle mixed local and external scripts', () => {
      const outputs = analyze({
        [ENTRY]: `
          <script type="module" src="./app.js"></script>
          <script type="module" src="https://esm.sh/react"></script>
          <script src="./legacy.js"></script>
          <script src="https://cdn.example.com/lib.js"></script>
        `,
        './app.js': 'export const a = 1;',
        './legacy.js': 'var b = 2;'
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      const scripts = outputs.get(LoaderType.Script) as Output<LoaderType.Script>[];
      expect(esModules).toHaveLength(1);
      expect(esModules[0].path).toBe('./app.js');
      expect(scripts).toHaveLength(3);
      const externalModule = scripts.find(s => s.src === 'https://esm.sh/react');
      expect(externalModule?.attributes?.type).toBe('module');
    });
  });

  describe('style tags', () => {
    it('should handle inline style', () => {
      const outputs = analyze({
        [ENTRY]: '<style>.btn { color: red; }</style>'
      });
      const styles = outputs.get(LoaderType.Style) as Output<LoaderType.Style>[];
      expect(styles).toHaveLength(1);
      expect(styles[0].path).toContain('#inline-style-');
      expect(styles[0].content).toBe('.btn { color: red; }');
    });

    it('should handle multiple inline styles', () => {
      const outputs = analyze({
        [ENTRY]: `
          <style>.a { color: red; }</style>
          <style>.b { color: blue; }</style>
        `
      });
      const styles = outputs.get(LoaderType.Style) as Output<LoaderType.Style>[];
      expect(styles).toHaveLength(2);
    });
  });

  describe('link tags', () => {
    it('should handle external stylesheet', () => {
      const outputs = analyze({
        [ENTRY]: '<link rel="stylesheet" href="./styles.css">',
        './styles.css': '.btn { color: red; }'
      });
      const styles = outputs.get(LoaderType.Style) as Output<LoaderType.Style>[];
      expect(styles).toHaveLength(1);
      expect(styles[0].path).toBe('./styles.css');
    });

    it('should ignore non-stylesheet links', () => {
      const outputs = analyze({
        [ENTRY]: '<link rel="icon" href="./favicon.ico">'
      });
      const styles = outputs.get(LoaderType.Style) as Output<LoaderType.Style>[];
      expect(styles).toHaveLength(0);
    });

    it('should handle CSS @import in linked stylesheet', () => {
      const outputs = analyze({
        [ENTRY]: '<link rel="stylesheet" href="./styles.css">',
        './styles.css': "@import './base.css';\n.btn { color: red; }",
        './base.css': 'body { margin: 0; }'
      });
      const styles = outputs.get(LoaderType.Style) as Output<LoaderType.Style>[];
      expect(styles).toHaveLength(2);
    });
  });

  describe('body content', () => {
    it('should extract body content as asset', () => {
      const outputs = analyze({
        [ENTRY]: '<div id="app">Hello</div>'
      });
      const assets = outputs.get(LoaderType.Asset) as Output<LoaderType.Asset>[];
      expect(assets).toHaveLength(1);
      expect(assets[0].content).toBe('<div id="app">Hello</div>');
    });

    it('should extract body content from full HTML document', () => {
      const outputs = analyze({
        [ENTRY]: `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<div id="app">Content</div>
</body>
</html>`
      });
      const assets = outputs.get(LoaderType.Asset) as Output<LoaderType.Asset>[];
      expect(assets).toHaveLength(1);
      expect(assets[0].content).toContain('<div id="app">Content</div>');
    });

    it('should exclude script, style, link tags from body content', () => {
      const outputs = analyze({
        [ENTRY]: `
          <div id="app">Content</div>
          <script>console.log("test")</script>
          <style>.test { color: red; }</style>
          <link rel="stylesheet" href="./styles.css">
        `,
        './styles.css': '.btn { color: blue; }'
      });
      const assets = outputs.get(LoaderType.Asset) as Output<LoaderType.Asset>[];
      expect(assets).toHaveLength(1);
      expect(assets[0].content).not.toContain('<script>');
      expect(assets[0].content).not.toContain('<style>');
      expect(assets[0].content).not.toContain('<link');
    });
  });

  describe('dependencies', () => {
    it('should handle ES module with external deps', () => {
      const outputs = analyze({
        [ENTRY]: '<script type="module" src="./app.js"></script>',
        './app.js': "import { useState } from 'react';\nuseState()"
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      expect(esModules).toHaveLength(1);
      expect(esModules[0].externals).toHaveLength(1);
      expect(esModules[0].externals?.[0].name).toBe('react');
    });

    it('should handle nested internal deps', () => {
      const outputs = analyze({
        [ENTRY]: '<script type="module" src="./app.js"></script>',
        './app.js': "import { helper } from './utils.js';\nhelper()",
        './utils.js': "export const helper = () => 'help'"
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      expect(esModules).toHaveLength(2);
      const paths = esModules.map(m => m.path);
      expect(paths).toContain('./app.js');
      expect(paths).toContain('./utils.js');
    });

    it('should handle circular deps by skipping visited', () => {
      const outputs = analyze({
        [ENTRY]: '<script type="module" src="./a.js"></script>',
        './a.js': "import { b } from './b.js';\nexport const a = () => b()",
        './b.js': "import { a } from './a.js';\nexport const b = () => a()"
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      expect(esModules).toHaveLength(2);
    });

    it('should handle inline module with internal deps', () => {
      const outputs = analyze({
        [ENTRY]: `<script type="module">
          import { helper } from './utils.js';
          helper();
        </script>`,
        './utils.js': "export const helper = () => 'help'"
      });
      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      expect(esModules).toHaveLength(2);
    });
  });

  describe('full HTML document', () => {
    it('should handle complete HTML document', () => {
      const outputs = analyze({
        [ENTRY]: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Test</title>
<link rel="stylesheet" href="./styles.css">
<style>body { font-family: sans-serif; }</style>
</head>
<body>
<div id="app"></div>
<script type="module" src="./app.js"></script>
<script>console.log("legacy")</script>
</body>
</html>`,
        './styles.css': '.container { max-width: 1200px; }',
        './app.js': "import { render } from './render.js';\nrender()",
        './render.js': 'export const render = () => {}'
      });

      const esModules = outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[];
      const styles = outputs.get(LoaderType.Style) as Output<LoaderType.Style>[];
      const scripts = outputs.get(LoaderType.Script) as Output<LoaderType.Script>[];
      const assets = outputs.get(LoaderType.Asset) as Output<LoaderType.Asset>[];

      expect(esModules).toHaveLength(2);
      expect(styles).toHaveLength(2);
      expect(scripts).toHaveLength(1);
      expect(assets).toHaveLength(1);
      expect(assets[0].content).toContain('<div id="app">');
    });
  });
});
