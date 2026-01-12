import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import remarkCodespark from './index';

const process = (md: string) => unified().use(remarkParse).use(remarkMdx).use(remarkCodespark).use(remarkStringify).processSync(md).toString().trim();

describe('remarkCodespark', () => {
  it('should transform tsx code block with codespark', () => {
    const input = '```tsx codespark\nexport default () => <div>Hello</div>\n```';
    const output = process(input);
    expect(output).toContain('<Codespark');
    expect(output).toContain('code={"export default () => <div>Hello</div>"}');
  });

  it('should transform jsx code block with codespark', () => {
    const input = '```jsx codespark\nexport default () => <span>Test</span>\n```';
    const output = process(input);
    expect(output).toContain('<Codespark');
  });

  it('should transform ts code block with codespark', () => {
    const input = '```ts codespark\nconst x: number = 1;\nexport default x;\n```';
    const output = process(input);
    expect(output).toContain('<Codespark');
  });

  it('should transform js code block with codespark', () => {
    const input = '```js codespark\nconst x = 1;\nexport default x;\n```';
    const output = process(input);
    expect(output).toContain('<Codespark');
  });

  it('should not transform code block without codespark', () => {
    const input = '```tsx\nexport default () => <div>Hello</div>\n```';
    const output = process(input);
    expect(output).not.toContain('<Codespark');
    expect(output).toContain('```tsx');
  });

  it('should not transform unsupported languages', () => {
    const input = '```python codespark\nprint("hello")\n```';
    const output = process(input);
    expect(output).not.toContain('<Codespark');
    expect(output).toContain('```python');
  });

  it('should handle name attribute', () => {
    const input = '```tsx codespark name="MyDemo"\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('name="MyDemo"');
  });

  it('should handle boolean attributes', () => {
    const input = '```tsx codespark editable\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('editable={true}');
  });

  it('should handle explicit boolean false', () => {
    const input = '```tsx codespark editable=false\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('editable={false}');
  });

  it('should handle numeric attributes', () => {
    const input = '```tsx codespark height=300\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('height={300}');
  });

  it('should handle quoted string attributes', () => {
    const input = '```tsx codespark title="Hello World"\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('title="Hello World"');
  });

  it('should escape quotes in code', () => {
    const input = '```tsx codespark\nexport default () => <div>{`template`}</div>\n```';
    const output = process(input);
    expect(output).toContain('`template`');
  });

  it('should escape template expressions in code', () => {
    const input = '```tsx codespark\nconst x = 1;\nexport default () => <div>{`${x}`}</div>\n```';
    const output = process(input);
    expect(output).toContain('${x}');
  });

  it('should handle multiple code blocks', () => {
    const input = `# Demo

\`\`\`tsx codespark name="First"
export default () => <div>First</div>
\`\`\`

Some text

\`\`\`tsx codespark name="Second"
export default () => <div>Second</div>
\`\`\``;
    const output = process(input);
    expect(output).toContain('name="First"');
    expect(output).toContain('name="Second"');
  });

  it('should preserve non-REPL code blocks', () => {
    const input = `\`\`\`tsx codespark
export default () => <div />
\`\`\`

\`\`\`bash
npm install
\`\`\``;
    const output = process(input);
    expect(output).toContain('<Codespark');
    expect(output).toContain('```bash');
  });
});
