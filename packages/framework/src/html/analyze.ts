import { render } from 'dom-serializer';
import type { Element, Text } from 'domhandler';
import { DomUtils, parseDocument } from 'htmlparser2';

import { CSSLoader } from '../loaders/css-loader';
import { ESLoader } from '../loaders/es-loader';
import { LoaderType } from '../loaders/types';
import type { Output, Outputs } from '../registry';

interface ParsedElement {
  type: 'script' | 'style' | 'link';
  isModule?: boolean;
  src?: string;
  href?: string;
  content?: string;
  attributes?: Record<string, string>;
}

const LOADERS = {
  es: new ESLoader(),
  css: new CSSLoader()
};

function isExternalUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

function getTextContent(element: Element) {
  return element.children
    .filter((child): child is Text => child.type === 'text')
    .map(child => child.data)
    .join('')
    .trim();
}

function extractAttributes(attribs: Record<string, string>, excludeKeys: string[]) {
  const filtered = Object.fromEntries(Object.entries(attribs).filter(([key]) => !excludeKeys.includes(key)));
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

function createLoaderContext(files: Record<string, string>) {
  return {
    getSource: (path: string) => files[path],
    resolve: (src: string) => (files[src] !== undefined ? src : null)
  };
}

function parseHTML(html: string): { elements: ParsedElement[]; bodyContent: string } {
  const doc = parseDocument(html);
  const elements: ParsedElement[] = [];

  const scripts = DomUtils.getElementsByTagName('script', doc) as Element[];
  for (const script of scripts) {
    const src = script.attribs.src;
    elements.push({
      type: 'script',
      isModule: script.attribs.type === 'module',
      src,
      content: src ? undefined : getTextContent(script),
      attributes: extractAttributes(script.attribs, ['src', 'type'])
    });
  }

  const styles = DomUtils.getElementsByTagName('style', doc) as Element[];
  for (const style of styles) {
    elements.push({
      type: 'style',
      content: getTextContent(style),
      attributes: extractAttributes(style.attribs, [])
    });
  }

  const links = DomUtils.getElementsByTagName('link', doc) as Element[];
  for (const link of links) {
    if (link.attribs.rel !== 'stylesheet' || !link.attribs.href) continue;
    elements.push({
      type: 'link',
      href: link.attribs.href,
      attributes: extractAttributes(link.attribs, ['href', 'rel'])
    });
  }

  const bodies = DomUtils.getElementsByTagName('body', doc) as Element[];
  const container = bodies.length > 0 ? bodies[0] : doc;

  const tagsToRemove = [...DomUtils.getElementsByTagName('script', container), ...DomUtils.getElementsByTagName('style', container), ...DomUtils.getElementsByTagName('link', container)];
  for (const tag of tagsToRemove) {
    DomUtils.removeElement(tag);
  }

  const bodyContent = render(DomUtils.getChildren(container)).trim();

  return { elements, bodyContent };
}

function processESModule(path: string, files: Record<string, string>, outputs: Outputs, visited = new Set<string>()) {
  if (visited.has(path)) return;
  visited.add(path);

  const source = files[path];
  if (source === undefined) return;

  const ctx = createLoaderContext(files);
  const output = LOADERS.es.transform(source, { resourcePath: path, ...ctx });

  getOutputArray(outputs, LoaderType.ESModule).push({
    path,
    content: output.content,
    dependencies: output.dependencies,
    externals: output.externals
  });

  for (const depPath of Object.values(output.dependencies)) {
    processESModule(depPath, files, outputs, visited);
  }
}

function processStylesheet(path: string, files: Record<string, string>, outputs: Outputs, visited = new Set<string>()) {
  if (visited.has(path)) return;
  visited.add(path);

  const source = files[path];
  if (source === undefined) return;

  const ctx = createLoaderContext(files);
  const output = LOADERS.css.transform(source, { resourcePath: path, ...ctx });

  getOutputArray(outputs, LoaderType.Style).push({
    path,
    content: output.content,
    imports: output.imports,
    attributes: output.attributes
  });

  for (const depPath of output.imports) {
    processStylesheet(depPath, files, outputs, visited);
  }
}

function getOutputArray<T extends LoaderType>(outputs: Outputs, type: T) {
  return outputs.get(type) as Output<T>[];
}

function createOutputs() {
  const outputs: Outputs = new Map();
  outputs.set(LoaderType.ESModule, []);
  outputs.set(LoaderType.Style, []);
  outputs.set(LoaderType.Script, []);
  outputs.set(LoaderType.Asset, []);

  return outputs;
}

function processScriptElement(el: ParsedElement, entry: string, files: Record<string, string>, outputs: Outputs, visited = new Set<string>()) {
  if (el.isModule) {
    processModuleScript(el, entry, files, outputs, visited);
  } else {
    processRegularScript(el, entry, files, outputs);
  }
}

function processModuleScript(el: ParsedElement, entry: string, files: Record<string, string>, outputs: Outputs, visited = new Set<string>()) {
  if (el.src) {
    if (isExternalUrl(el.src)) {
      getOutputArray(outputs, LoaderType.Script).push({
        path: el.src,
        content: '',
        src: el.src,
        attributes: { ...el.attributes, type: 'module' }
      });
    } else if (files[el.src] !== undefined) {
      processESModule(el.src, files, outputs, visited);
    }
    return;
  }

  if (!el.content) return;

  const virtualPath = `${entry}#inline-module-${getOutputArray(outputs, LoaderType.ESModule).length}`;
  const ctx = createLoaderContext(files);
  const output = LOADERS.es.transform(el.content, { resourcePath: virtualPath, ...ctx });

  getOutputArray(outputs, LoaderType.ESModule).push({
    path: virtualPath,
    content: output.content,
    dependencies: output.dependencies,
    externals: output.externals
  });

  for (const depPath of Object.values(output.dependencies)) {
    processESModule(depPath, files, outputs, visited);
  }
}

function processRegularScript(el: ParsedElement, entry: string, files: Record<string, string>, outputs: Outputs) {
  if (el.src) {
    if (isExternalUrl(el.src)) {
      getOutputArray(outputs, LoaderType.Script).push({
        path: el.src,
        content: '',
        src: el.src,
        attributes: el.attributes
      });
    } else if (files[el.src] !== undefined) {
      getOutputArray(outputs, LoaderType.Script).push({
        path: el.src,
        content: files[el.src],
        attributes: el.attributes
      });
    }
    return;
  }

  if (!el.content) return;

  const virtualPath = `${entry}#inline-script-${getOutputArray(outputs, LoaderType.Script).length}`;
  getOutputArray(outputs, LoaderType.Script).push({
    path: virtualPath,
    content: el.content,
    attributes: el.attributes
  });
}

function processStyleElement(el: ParsedElement, entry: string, outputs: Outputs) {
  if (!el.content) return;

  const virtualPath = `${entry}#inline-style-${getOutputArray(outputs, LoaderType.Style).length}`;
  getOutputArray(outputs, LoaderType.Style).push({
    path: virtualPath,
    content: el.content,
    imports: [],
    attributes: el.attributes
  });
}

function processLinkElement(el: ParsedElement, files: Record<string, string>, outputs: Outputs, visited = new Set<string>()) {
  if (!el.href) return;

  if (isExternalUrl(el.href)) {
    getOutputArray(outputs, LoaderType.Style).push({
      path: el.href,
      content: '',
      imports: [],
      href: el.href,
      attributes: el.attributes
    });
  } else if (files[el.href] !== undefined) {
    processStylesheet(el.href, files, outputs, visited);
  }
}

export function analyze(entry: string, files: Record<string, string>) {
  const outputs = createOutputs();

  const html = files[entry];
  if (!html) return outputs;

  const { elements, bodyContent } = parseHTML(html);

  for (const el of elements) {
    if (el.type === 'script') {
      processScriptElement(el, entry, files, outputs);
    } else if (el.type === 'style') {
      processStyleElement(el, entry, outputs);
    } else if (el.type === 'link') {
      processLinkElement(el, files, outputs);
    }
  }

  if (bodyContent) {
    getOutputArray(outputs, LoaderType.Asset).push({ path: entry, content: bodyContent });
  }

  return outputs;
}
