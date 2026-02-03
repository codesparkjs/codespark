import { parse } from '@babel/parser';
import { Framework as Base } from '@codespark/framework';
import MagicString from 'magic-string';

import { LoaderType } from '../loaders/types';
import type { Output, Outputs } from '../registry';
import { analyze } from './analyze';

function serializeAttributes(attrs?: Record<string, string>) {
  if (!attrs || Object.keys(attrs).length === 0) return '';

  return Object.entries(attrs)
    .map(([key, value]) => (value === '' ? ` ${key}` : ` ${key}="${value}"`))
    .join('');
}

export interface FrameworkConfig {
  liteMode?: {
    enabled?: boolean;
    htmlEntry?: string;
    scriptEntry?: string;
    styleEntry?: string;
  };
}

export class Framework extends Base {
  readonly name = 'html';
  readonly imports = {};
  outputs: Outputs = new Map();

  private blobUrlMap = new Map<string, string>();

  constructor(private config?: FrameworkConfig) {
    super();
  }

  analyze(entry: string, files: Record<string, string>) {
    const { enabled, htmlEntry = entry } = this.config?.liteMode ?? {};
    if (enabled) {
      this.outputs = analyze(entry, { ...files, [htmlEntry]: this.wrapInLiteModeTemplate(files[htmlEntry] ?? '') });
    } else {
      this.outputs = analyze(entry, files);
    }
  }

  compile(): string {
    const builder = this.createBuilder();

    const assets = this.getOutput(LoaderType.Asset);
    const styles = this.getOutput(LoaderType.Style);
    const scripts = this.getOutput(LoaderType.Script);
    const modules = this.getOutput(LoaderType.ESModule);

    let htmlContent = assets.map(a => a.content).join('');

    for (const style of styles) {
      if (style.href) {
        htmlContent += `<link${serializeAttributes(style.attributes)} rel="stylesheet" href="${style.href}">`;
      } else {
        htmlContent += `<style${serializeAttributes(style.attributes)}>${style.content}</style>`;
      }
    }

    for (const script of scripts) {
      if (script.src) {
        htmlContent += `<script${serializeAttributes(script.attributes)} src="${script.src}"></script>`;
      } else {
        htmlContent += `<script${serializeAttributes(script.attributes)}>${script.content}</script>`;
      }
    }

    if (modules.length > 0) {
      const entryCode = this.transformModulesToBlob([...modules].reverse());
      if (entryCode) {
        htmlContent += `<script type="module">${entryCode}</script>`;
      }
    }

    // clear style & script outputs to avoid multi injection
    this.outputs.set(LoaderType.Style, []);
    this.outputs.set(LoaderType.Script, []);

    return builder
      .setHTML(JSON.stringify(htmlContent), {
        target: 'body',
        activateScripts: scripts.length > 0 || modules.length > 0
      })
      .done();
  }

  private wrapInLiteModeTemplate(htmlFragment: string) {
    const { scriptEntry = './index.js', styleEntry = './index.css' } = this.config?.liteMode ?? {};

    return `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="${styleEntry}">
  <script type="module" src="${scriptEntry}"></script>
</head>
<body>
${htmlFragment}
</body>
</html>`;
  }

  private transformModulesToBlob(modules: Output<LoaderType.ESModule>[]) {
    let entryCode = '';

    for (let index = 0; index < modules.length; index++) {
      const mod = modules[index];
      const isEntry = index === modules.length - 1;
      const code = this.transformCodeWithBlobUrls(mod);

      if (isEntry) {
        entryCode = code;
      } else {
        const blob = new Blob([code], { type: 'application/javascript' });
        this.blobUrlMap.set(mod.path, URL.createObjectURL(blob));
      }
    }

    return entryCode;
  }

  private transformCodeWithBlobUrls(mod: Output<LoaderType.ESModule>) {
    const s = new MagicString(mod.content);
    const ast = parse(mod.content, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

    for (const node of ast) {
      if (node.type !== 'ImportDeclaration') continue;

      const resolved = mod.dependencies[node.source.value];
      if (!resolved) continue;

      const blobUrl = this.blobUrlMap.get(resolved);
      if (blobUrl) {
        s.update(node.source.start! + 1, node.source.end! - 1, blobUrl);
      } else {
        s.remove(node.start!, node.end!);
      }
    }

    return s.toString();
  }
}

export const html = new Framework();
