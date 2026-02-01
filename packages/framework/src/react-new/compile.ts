import { parse } from '@babel/parser';
import MagicString from 'magic-string';

import { OutputType } from '../loaders/types';
import type { OutputItem } from '../registry';

const blobUrlMap = new Map<string, string>();

export function compile(outputs: Map<OutputType, OutputItem[]>): string {
  const modules = outputs.get(OutputType.ESModule) ?? [];
  return transformModulesToBlob(modules.reverse());
}

function transformModulesToBlob(modules: OutputItem[]) {
  let entryCode = '';

  modules.forEach((mod, index) => {
    const code = transformCodeWithBlobUrls(mod);

    if (index === modules.length - 1) {
      entryCode = code;
    } else {
      const blob = new Blob([code], { type: 'application/javascript' });
      blobUrlMap.set(mod.path, URL.createObjectURL(blob));
    }
  });

  return entryCode;
}

function transformCodeWithBlobUrls(mod: OutputItem) {
  const s = new MagicString(mod.content);
  const ast = parse(mod.content, { sourceType: 'module', plugins: ['jsx', 'typescript'] }).program.body;

  for (const node of ast) {
    if (node.type !== 'ImportDeclaration') continue;

    const resolved = mod.imports.get(node.source.value);
    if (!resolved) continue;

    const blobUrl = blobUrlMap.get(resolved);
    if (blobUrl) {
      s.update(node.source.start! + 1, node.source.end! - 1, blobUrl);
    } else {
      s.remove(node.start!, node.end!);
    }
  }

  return s.toString();
}
