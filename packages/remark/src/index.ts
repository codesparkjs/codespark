import { valueToEstree } from 'estree-util-value-to-estree';
import type { Parent, Root } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const DIRECTIVE_KEYS = ['codespark', 'codespark-editor', 'codespark-preview'];

type CodesparkDirective = 'codespark' | 'codespark-editor' | 'codespark-preview';

interface CodeBlockMetaParams extends Record<string, string | boolean | undefined> {
  codespark?: boolean;
  'codespark-editor'?: boolean;
  'codespark-preview'?: boolean;
  name?: string;
  file?: string;
}

interface FileBlock {
  file: string;
  code: string;
  index: number;
}

interface Transformation {
  parent: Parent;
  index: number;
  deleteCount: number;
  replacement: MdxJsxFlowElement;
}

function createExpressionValue(value: unknown): MdxJsxAttribute['value'] {
  const estree = valueToEstree(value);

  return {
    type: 'mdxJsxAttributeValueExpression',
    value: JSON.stringify(value),
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [{ type: 'ExpressionStatement', expression: estree }]
      }
    }
  };
}

function parseAttributeValue(value: string | boolean | undefined): MdxJsxAttribute['value'] {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return createExpressionValue(value);
  }

  if (value === 'true') {
    return createExpressionValue(true);
  }

  if (value === 'false') {
    return createExpressionValue(false);
  }

  if (!isNaN(Number(value))) {
    return createExpressionValue(Number(value));
  }

  return value;
}

function createJsxAttribute(name: string, value: MdxJsxAttribute['value']): MdxJsxAttribute {
  return { type: 'mdxJsxAttribute', name, value };
}

function createJsxExpressionAttribute(name: string, value: string | unknown[] | object): MdxJsxAttribute {
  return createJsxAttribute(name, createExpressionValue(value));
}

function createCodesparkComponent(name: string, attributes: MdxJsxAttribute[]): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name,
    attributes,
    children: []
  };
}

function getComponentConfig(directive: CodesparkDirective): { componentName: string; codePropName: string } {
  switch (directive) {
    case 'codespark-editor':
      return { componentName: 'CodesparkEditor', codePropName: 'value' };
    case 'codespark-preview':
      return { componentName: 'CodesparkPreview', codePropName: 'code' };
    default:
      return { componentName: 'Codespark', codePropName: 'code' };
  }
}

function parseMetaString(meta: string | null | undefined): CodeBlockMetaParams {
  if (!meta) {
    return {};
  }

  const params: CodeBlockMetaParams = {};
  const regex = /([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match;

  while ((match = regex.exec(meta)) !== null) {
    const [, key, doubleQuoted, singleQuoted, unquoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? unquoted;

    if (value === undefined) {
      params[key] = true;
    } else if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else {
      params[key] = value;
    }
  }

  return params;
}

function getCodesparkDirective(params: CodeBlockMetaParams): CodesparkDirective | null {
  if (params['codespark-editor'] === true) {
    return 'codespark-editor';
  }

  if (params['codespark-preview'] === true) {
    return 'codespark-preview';
  }

  if (params.codespark === true) {
    return 'codespark';
  }

  return null;
}

function isCodesparkBlock(lang: string | null | undefined, params: CodeBlockMetaParams): boolean {
  const supportedLanguages = ['js', 'jsx', 'ts', 'tsx'];
  return supportedLanguages.includes(lang || '') && getCodesparkDirective(params) !== null;
}

function extractSharedAttributes(params: CodeBlockMetaParams): [string, string | boolean | undefined][] {
  return Object.entries(params).filter(([key]) => !DIRECTIVE_KEYS.includes(key) && key !== 'file');
}

function attributesMatch(attrs1: [string, string | boolean | undefined][], attrs2: [string, string | boolean | undefined][]): boolean {
  return JSON.stringify(attrs1) === JSON.stringify(attrs2);
}

function collectConsecutiveFileBlocks(parent: Parent, startIndex: number, startParams: CodeBlockMetaParams, startValue: string): FileBlock[] {
  const fileBlocks: FileBlock[] = [{ file: startParams.file as string, code: startValue, index: startIndex }];

  const sharedAttributes = extractSharedAttributes(startParams);
  let currentIndex = startIndex + 1;

  while (currentIndex < parent.children.length) {
    const currentNode = parent.children[currentIndex];

    if (currentNode.type !== 'code') {
      break;
    }

    const currentParams = parseMetaString(currentNode.meta);

    if (!isCodesparkBlock(currentNode.lang, currentParams) || !currentParams.file) {
      break;
    }

    const currentAttributes = extractSharedAttributes(currentParams);

    if (!attributesMatch(sharedAttributes, currentAttributes)) {
      break;
    }

    fileBlocks.push({
      file: currentParams.file as string,
      code: currentNode.value,
      index: currentIndex
    });

    currentIndex++;
  }

  return fileBlocks;
}

function createFilesObject(fileBlocks: FileBlock[]): Record<string, string> {
  const filesObject: Record<string, string> = {};

  for (const { file, code } of fileBlocks) {
    filesObject[file] = code;
  }

  return filesObject;
}

function createAttributesForFileBlocks(filesObject: Record<string, string>, sharedAttributes: [string, string | boolean | undefined][]): MdxJsxAttribute[] {
  const attributes: MdxJsxAttribute[] = [createJsxExpressionAttribute('files', filesObject)];

  for (const [key, value] of sharedAttributes) {
    attributes.push(createJsxAttribute(key, parseAttributeValue(value)));
  }

  return attributes;
}

function createAttributesForCodeBlock(code: string, params: CodeBlockMetaParams, directive: CodesparkDirective): MdxJsxAttribute[] {
  const { codePropName } = getComponentConfig(directive);
  const attributes: MdxJsxAttribute[] = [];

  if (directive === 'codespark') {
    attributes.push(createJsxAttribute('name', params.name || './App.tsx'));
  }

  attributes.push(createJsxExpressionAttribute(codePropName, code));

  const excludeKeys = [...DIRECTIVE_KEYS, 'name', 'code', 'value'];
  const extraAttributes = Object.entries(params).filter(([key]) => !excludeKeys.includes(key));

  for (const [key, value] of extraAttributes) {
    attributes.push(createJsxAttribute(key, parseAttributeValue(value)));
  }

  return attributes;
}

const remarkCodespark: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const transformations: Transformation[] = [];
    const processedIndices = new Set<number>();

    visit(tree, 'code', (node, index, parent) => {
      if (!parent || index === undefined || processedIndices.has(index)) {
        return;
      }

      const { lang, value, meta } = node;
      const params = parseMetaString(meta);

      if (!isCodesparkBlock(lang, params)) {
        return;
      }

      try {
        const directive = getCodesparkDirective(params)!;
        const { componentName } = getComponentConfig(directive);

        if (directive === 'codespark' && params.file) {
          const fileBlocks = collectConsecutiveFileBlocks(parent, index, params, value);
          const filesObject = createFilesObject(fileBlocks);
          const sharedAttributes = extractSharedAttributes(params);
          const attributes = createAttributesForFileBlocks(filesObject, sharedAttributes);

          transformations.push({
            parent,
            index,
            deleteCount: fileBlocks.length,
            replacement: createCodesparkComponent(componentName, attributes)
          });

          for (const { index: blockIndex } of fileBlocks) {
            processedIndices.add(blockIndex);
          }
        } else {
          const attributes = createAttributesForCodeBlock(value, params, directive);

          transformations.push({
            parent,
            index,
            deleteCount: 1,
            replacement: createCodesparkComponent(componentName, attributes)
          });

          processedIndices.add(index);
        }
      } catch {
        // eslint-disable-next-line no-console
        console.log(`code block \`\`\`${lang} ${meta} transform error.`);
      }
    });

    transformations.reverse();

    for (const { parent, index, deleteCount, replacement } of transformations) {
      parent.children.splice(index, deleteCount, replacement);
    }
  };
};

export default remarkCodespark;
