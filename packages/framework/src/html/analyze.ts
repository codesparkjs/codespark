import { CSSLoader } from '../loaders/css-loader';
import { ESLoader } from '../loaders/es-loader';
import { LoaderType } from '../loaders/types';
import type { Output, Outputs } from '../registry';

const EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx'] as const;

const LOADERS = {
  es: new ESLoader(),
  css: new CSSLoader()
};

export function resolve(source: string, from: string, files: Record<string, string>) {
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
    const indexPath = `${resolved}/index${ext}`;
    if (files[indexPath] !== undefined) return indexPath;
  }

  return null;
}

function processESModule(path: string, files: Record<string, string>, outputs: Outputs, visited: Set<string>) {
  if (visited.has(path)) return;
  visited.add(path);

  const source = files[path];
  if (source === undefined) return;

  const output = LOADERS.es.transform(source, {
    resourcePath: path,
    getSource: p => files[p],
    resolve: src => resolve(src, path, files)
  });

  const { content, dependencies, externals } = output;
  (outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[]).push({
    path,
    content,
    dependencies,
    externals
  });

  for (const depPath of Object.values(dependencies)) {
    processESModule(depPath, files, outputs, visited);
  }
}

function processStylesheet(path: string, files: Record<string, string>, outputs: Outputs, visited: Set<string>) {
  if (visited.has(path)) return;
  visited.add(path);

  const source = files[path];
  if (source === undefined) return;

  const output = LOADERS.css.transform(source, {
    resourcePath: path,
    getSource: p => files[p],
    resolve: src => resolve(src, path, files)
  });

  const { content, imports } = output;
  (outputs.get(LoaderType.Style) as Output<LoaderType.Style>[]).push({
    path,
    content,
    imports
  });

  for (const depPath of imports) {
    processStylesheet(depPath, files, outputs, visited);
  }
}

interface ParsedElement {
  type: 'script' | 'style' | 'link';
  isModule?: boolean;
  src?: string;
  href?: string;
  content?: string;
}

function parseHTML(html: string): { elements: ParsedElement[]; bodyContent: string } {
  const elements: ParsedElement[] = [];

  // Extract <script> tags
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const attrs = match[1];
    const content = match[2].trim();

    const isModule = /type\s*=\s*["']module["']/i.test(attrs);
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);

    elements.push({
      type: 'script',
      isModule,
      src: srcMatch?.[1],
      content: srcMatch ? undefined : content
    });
  }

  // Extract <style> tags
  const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/gi;

  while ((match = styleRegex.exec(html)) !== null) {
    const content = match[2].trim();
    elements.push({
      type: 'style',
      content
    });
  }

  // Extract <link rel="stylesheet"> tags
  const linkRegex = /<link([^>]*)>/gi;

  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    if (!/rel\s*=\s*["']stylesheet["']/i.test(attrs)) continue;

    const hrefMatch = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (hrefMatch) {
      elements.push({
        type: 'link',
        href: hrefMatch[1]
      });
    }
  }

  // Extract body content (remove script, style, link tags)
  let bodyContent = html;

  // Try to extract just the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  }

  // Remove script tags
  bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove style tags
  bodyContent = bodyContent.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove link tags
  bodyContent = bodyContent.replace(/<link[^>]*>/gi, '');
  // Clean up whitespace
  bodyContent = bodyContent.trim();

  return { elements, bodyContent };
}

export function analyze(entry: string, files: Record<string, string>) {
  const outputs: Outputs = new Map();
  outputs.set(LoaderType.ESModule, []);
  outputs.set(LoaderType.Style, []);
  outputs.set(LoaderType.Script, []);
  outputs.set(LoaderType.Asset, []);

  const html = files[entry];
  if (!html) return outputs;

  const { elements, bodyContent } = parseHTML(html);
  const visitedES = new Set<string>();
  const visitedCSS = new Set<string>();

  for (const el of elements) {
    if (el.type === 'script') {
      if (el.isModule) {
        // ES Module script
        if (el.src) {
          const resolved = resolve(el.src, entry, files);
          if (resolved) {
            processESModule(resolved, files, outputs, visitedES);
          }
        } else if (el.content) {
          // Inline module - treat as entry module
          const virtualPath = `${entry}#inline-module-${outputs.get(LoaderType.ESModule)!.length}`;
          const output = LOADERS.es.transform(el.content, {
            resourcePath: virtualPath,
            getSource: p => files[p],
            resolve: src => resolve(src, entry, files)
          });
          (outputs.get(LoaderType.ESModule) as Output<LoaderType.ESModule>[]).push({
            path: virtualPath,
            content: output.content,
            dependencies: output.dependencies,
            externals: output.externals
          });
          // Process dependencies
          for (const depPath of Object.values(output.dependencies)) {
            processESModule(depPath, files, outputs, visitedES);
          }
        }
      } else {
        // Regular script
        if (el.src) {
          const resolved = resolve(el.src, entry, files);
          if (resolved && files[resolved]) {
            (outputs.get(LoaderType.Script) as Output<LoaderType.Script>[]).push({
              path: resolved,
              content: files[resolved]
            });
          }
        } else if (el.content) {
          const virtualPath = `${entry}#inline-script-${outputs.get(LoaderType.Script)!.length}`;
          (outputs.get(LoaderType.Script) as Output<LoaderType.Script>[]).push({
            path: virtualPath,
            content: el.content
          });
        }
      }
    } else if (el.type === 'style') {
      // Inline style
      if (el.content) {
        const virtualPath = `${entry}#inline-style-${outputs.get(LoaderType.Style)!.length}`;
        (outputs.get(LoaderType.Style) as Output<LoaderType.Style>[]).push({
          path: virtualPath,
          content: el.content,
          imports: []
        });
      }
    } else if (el.type === 'link') {
      // External stylesheet
      if (el.href) {
        const resolved = resolve(el.href, entry, files);
        if (resolved) {
          processStylesheet(resolved, files, outputs, visitedCSS);
        }
      }
    }
  }

  // Add body content as asset
  if (bodyContent) {
    (outputs.get(LoaderType.Asset) as Output<LoaderType.Asset>[]).push({
      path: entry,
      content: bodyContent
    });
  }

  return outputs;
}
