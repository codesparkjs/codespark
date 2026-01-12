import { valueToEstree } from 'estree-util-value-to-estree';
import type { Root } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

interface CodeBlockMetaParams extends Record<string, string | boolean | undefined> {
  codespark?: boolean;
  name?: string;
}

const createExpressionValue = (value: unknown): MdxJsxAttribute['value'] => {
  const estree = valueToEstree(value);

  return {
    type: 'mdxJsxAttributeValueExpression',
    value: JSON.stringify(value),
    data: { estree: { type: 'Program', sourceType: 'module', body: [{ type: 'ExpressionStatement', expression: estree }] } }
  };
};

const parseAttrValue = (value: string | boolean | undefined): MdxJsxAttribute['value'] => {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return createExpressionValue(value);
  if (value === 'true') return createExpressionValue(true);
  if (value === 'false') return createExpressionValue(false);
  if (!isNaN(Number(value))) return createExpressionValue(Number(value));
  return value;
};

const createJsxAttr = (name: string, value: MdxJsxAttribute['value']): MdxJsxAttribute => ({ type: 'mdxJsxAttribute', name, value });

const createJsxExpressionAttr = (name: string, value: string | unknown[] | object) => createJsxAttr(name, createExpressionValue(value));

const createComponentNode = (attributes: MdxJsxAttribute[]): MdxJsxFlowElement => ({ type: 'mdxJsxFlowElement', name: 'Codespark', attributes, children: [] });

const parseMeta = (meta: string | null | undefined): CodeBlockMetaParams => {
  if (!meta) return {};
  const params: CodeBlockMetaParams = {};
  const regex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match;
  while ((match = regex.exec(meta)) !== null) {
    const [, key, doubleQuoted, singleQuoted, unquoted] = match;
    const val = doubleQuoted ?? singleQuoted ?? unquoted;
    if (val === undefined) params[key] = true;
    else if (val === 'true') params[key] = true;
    else if (val === 'false') params[key] = false;
    else params[key] = val;
  }
  return params;
};

const remarkCodespark: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, 'code', (node, index, parent) => {
      // code block transformation logic
      const { lang, value, meta } = node;
      const params = parseMeta(meta);
      if (!['js', 'jsx', 'ts', 'tsx'].includes(lang || '') || !params?.codespark || !parent || index === undefined) return;

      try {
        const baseAttrs = [createJsxAttr('name', params.name || 'App.tsx'), createJsxExpressionAttr('code', value)];
        const extraAttrs = Object.entries(params)
          .filter(([k]) => !['codespark', 'name', 'code'].includes(k))
          .map(([k, v]) => createJsxAttr(k, parseAttrValue(v)));

        parent.children.splice(index, 1, createComponentNode([...baseAttrs, ...extraAttrs]));
      } catch {
        // eslint-disable-next-line no-console
        console.log(`code block \`\`\`${lang} ${meta} transform error.`);
      }
    });
  };
};

export default remarkCodespark;
