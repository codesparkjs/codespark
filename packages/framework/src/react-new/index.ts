import type { Dep, ExternalDep, InternalDep } from '_shared/types';
import { parse } from '@babel/parser';
import { availablePresets } from '@babel/standalone';
import { Framework as Base } from '@codespark/framework';

import { CSSLoader } from '../loaders/css-loader';
import { ESLoader } from '../loaders/es-loader';
import { JSONLoader } from '../loaders/json-loader';
import { type Loader, type LoaderOutput, OutputType } from '../loaders/types';

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

interface CompileContext {
  files: Record<string, string>;
  visited: Set<string>;
  outputs: Map<OutputType, { path: string; content: string }[]>;
  externals: Map<string, ExternalDep>;
  blobUrlMap: Map<string, string>;
}

export class Framework extends Base {
  readonly name = 'react';
  readonly imports = {
    react: 'https://esm.sh/react@18.2.0',
    'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime',
    'react-dom/client': 'https://esm.sh/react-dom@18.2.0/client'
  };

  private loaders: Loader[] = [];
  private blobUrlMap = new Map<string, string>();

  constructor() {
    super();
    this.loaders = [
      new ESLoader({
        jsxPreset: [availablePresets.react, { runtime: 'automatic' }],
        isTSX: true
      }),
      new CSSLoader(),
      new JSONLoader()
    ];
  }

  analyze(entry: string, files: Record<string, string>): Dep[] {
    const ctx: CompileContext = {
      files,
      visited: new Set(),
      outputs: new Map(),
      externals: new Map(),
      blobUrlMap: new Map()
    };

    Object.values(OutputType).forEach(type => {
      ctx.outputs.set(type, []);
    });

    const deps: Dep[] = [];
    const output = this.processFile(entry, ctx);
    if (!output) return deps;

    for (const depPath of output.dependencies) {
      const dep = this.buildInternalDep(depPath, ctx, depPath);
      if (dep) deps.push(dep);
    }

    deps.push(...output.externals);
    return deps;
  }

  compile(entry: string, files: Record<string, string>) {
    const wrappedSource = this.wrapEntrySource(files[entry]);
    const wrappedFiles = { ...files, [entry]: wrappedSource };

    const ctx: CompileContext = {
      files: wrappedFiles,
      visited: new Set(),
      outputs: new Map(),
      externals: new Map(),
      blobUrlMap: new Map()
    };

    Object.values(OutputType).forEach(type => {
      ctx.outputs.set(type, []);
    });

    this.processFile(entry, ctx);

    const entryCode = this.generateFinalCode(entry, ctx);

    this.blobUrlMap = ctx.blobUrlMap;

    return entryCode;
  }

  revoke(): void {
    for (const url of this.blobUrlMap.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlMap.clear();
  }

  private matchLoader(path: string): Loader | null {
    return this.loaders.find(l => l.test.test(path)) ?? null;
  }

  private resolve(source: string, from: string, files: Record<string, string>): string | null {
    if (!source.startsWith('.') && !source.startsWith('/')) {
      return null;
    }

    const fromDir = from.split('/').slice(0, -1);
    for (const part of source.split('/')) {
      if (part === '..') fromDir.pop();
      else if (part !== '.') fromDir.push(part);
    }
    const resolved = fromDir.join('/') || '.';

    if (files[resolved] !== undefined) return resolved;

    for (const ext of EXTENSIONS) {
      if (files[resolved + ext] !== undefined) return resolved + ext;
    }

    for (const ext of EXTENSIONS) {
      const indexPath = resolved + '/index' + ext;
      if (files[indexPath] !== undefined) return indexPath;
    }

    return null;
  }

  private processFile(path: string, ctx: CompileContext): LoaderOutput | null {
    if (ctx.visited.has(path)) return null;
    ctx.visited.add(path);

    const loader = this.matchLoader(path);
    if (!loader) return null;

    const source = ctx.files[path];
    if (source === undefined) return null;

    const output = loader.transform(source, {
      resourcePath: path,
      getSource: p => ctx.files[p],
      resolve: src => this.resolve(src, path, ctx.files)
    });

    ctx.outputs.get(output.type)!.push({ path, content: output.content });

    for (const ext of output.externals) {
      const existing = ctx.externals.get(ext.name);
      if (existing) {
        ext.imported.forEach(i => {
          if (!existing.imported.includes(i)) {
            existing.imported.push(i);
          }
        });
      } else {
        ctx.externals.set(ext.name, { ...ext });
      }
    }

    for (const dep of output.dependencies) {
      this.processFile(dep, ctx);
    }

    return output;
  }

  private buildInternalDep(path: string, ctx: CompileContext, alias: string): InternalDep | null {
    const source = ctx.files[path];
    if (source === undefined) return null;

    const loader = this.matchLoader(path);
    if (!loader) return null;

    const output = loader.transform(source, {
      resourcePath: path,
      getSource: p => ctx.files[p],
      resolve: src => this.resolve(src, path, ctx.files)
    });

    const deps: Dep[] = [];

    for (const depPath of output.dependencies) {
      const dep = this.buildInternalDep(depPath, ctx, depPath);
      if (dep) deps.push(dep);
    }

    deps.push(...output.externals);

    return {
      name: path.split('/').pop() || path,
      alias,
      code: source,
      deps
    };
  }

  private generateFinalCode(entry: string, ctx: CompileContext): string {
    const modules = (ctx.outputs.get(OutputType.ESModule) || []).reverse();

    for (const mod of modules) {
      if (mod.path === entry) continue;

      const code = this.replaceImportsWithBlobUrls(mod.content, mod.path, ctx);
      const blob = new Blob([code], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      ctx.blobUrlMap.set(mod.path, blobUrl);
    }

    const entryModule = modules.find(m => m.path === entry);
    if (entryModule) {
      return this.replaceImportsWithBlobUrls(entryModule.content, entryModule.path, ctx);
    }

    return '';
  }

  private replaceImportsWithBlobUrls(code: string, fromPath: string, ctx: CompileContext): string {
    const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;
    const s = this.createBuilder(code);

    for (const node of ast) {
      if (node.type === 'ImportDeclaration') {
        const importSource = node.source.value;
        const resolved = this.resolve(importSource, fromPath, ctx.files);
        if (resolved) {
          const blobUrl = ctx.blobUrlMap.get(resolved);
          if (blobUrl) {
            // 模块已被转换为 ESModule 并生成了 blob URL，替换 import 路径
            s.update(node.source.start! + 1, node.source.end! - 1, blobUrl);
          } else {
            // 模块没有生成 blob URL（如 CSS、JSON 等非 ESModule 输出），移除 import
            s.remove(node.start!, node.end!);
          }
        }
      }
    }

    return s.toString();
  }

  private wrapEntrySource(source: string): string {
    const builder = this.createBuilder(source);
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

    let name: string | undefined;
    for (const node of ast) {
      if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration') {
        name = node.declaration?.id?.name;
      } else if (node.type === 'ExportDefaultDeclaration') {
        const declaration = node.declaration;
        switch (declaration.type) {
          case 'Identifier':
            name = declaration.name;
            break;
          case 'ArrowFunctionExpression':
            if (declaration.async) {
              throw new Error('Export an async function');
            }
            name = 'App';
            builder.update(declaration.start!, declaration.body.start! - 1, 'function App() ');
            break;
          case 'FunctionDeclaration':
            if (declaration.async) {
              throw new Error('Export an async function');
            }
            if (declaration.id) {
              name = declaration.id.name;
            } else {
              name = 'App';
              builder.update(declaration.start!, declaration.body.start! - 1, 'function App() ');
            }
            break;
          default:
            throw new Error(`Default export type is invalid: expect a FunctionExpression but got ${declaration.type}`);
        }
      }
    }

    builder.async(`
      const { createRoot } = await import('react-dom/client');
      window.__root__ = window.__root__ || createRoot(${builder.root});
      window.__root__.render(${name ? `<${name} />` : 'null'});
    `);

    return builder.toString();
  }
}

export const react = new Framework();
