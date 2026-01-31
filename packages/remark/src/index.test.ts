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

  it('should merge consecutive file blocks into files property', () => {
    const input = `\`\`\`tsx codespark file="./button.tsx"
export const Button = () => <button>Click</button>
\`\`\`

\`\`\`tsx codespark file="./App.tsx"
import { Button } from './button'
export default () => <Button />
\`\`\``;
    const output = process(input);
    expect(output).toContain('<Codespark');
    expect(output).toContain('files={');
    expect(output).toContain('./button.tsx');
    expect(output).toContain('./App.tsx');
    expect(output).not.toContain('code=');
    // Should only have one Codespark component
    expect((output.match(/<Codespark/g) || []).length).toBe(1);
  });

  it('should not merge file blocks separated by other content', () => {
    const input = `\`\`\`tsx codespark file="./button.tsx"
export const Button = () => <button>Click</button>
\`\`\`

Some text in between

\`\`\`tsx codespark file="./App.tsx"
export default () => <div />
\`\`\``;
    const output = process(input);
    // Should have two separate Codespark components
    expect((output.match(/<Codespark/g) || []).length).toBe(2);
  });

  it('should not merge file blocks with different attributes', () => {
    const input = `\`\`\`tsx codespark file="./button.tsx" editable
export const Button = () => <button>Click</button>
\`\`\`

\`\`\`tsx codespark file="./App.tsx"
export default () => <div />
\`\`\``;
    const output = process(input);
    // Should have two separate Codespark components due to different attributes
    expect((output.match(/<Codespark/g) || []).length).toBe(2);
  });

  it('should preserve shared attributes when merging file blocks', () => {
    const input = `\`\`\`tsx codespark file="./button.tsx" readonly height=400
export const Button = () => <button>Click</button>
\`\`\`

\`\`\`tsx codespark file="./App.tsx" readonly height=400
export default () => <div />
\`\`\``;
    const output = process(input);
    expect(output).toContain('files={');
    expect(output).toContain('readonly={true}');
    expect(output).toContain('height={400}');
    expect((output.match(/<Codespark/g) || []).length).toBe(1);
  });

  it('should handle single file block without merging', () => {
    const input = `\`\`\`tsx codespark file="./App.tsx"
export default () => <div>Single file</div>
\`\`\``;
    const output = process(input);
    expect(output).toContain('<Codespark');
    expect(output).toContain('files={');
    expect(output).toContain('./App.tsx');
  });

  it('should handle mix of file blocks and regular code blocks', () => {
    const input = `\`\`\`tsx codespark file="./button.tsx"
export const Button = () => <button>Click</button>
\`\`\`

\`\`\`tsx codespark file="./App.tsx"
export default () => <div />
\`\`\`

\`\`\`tsx codespark
export default () => <span>Regular</span>
\`\`\``;
    const output = process(input);
    // Should have two Codespark components: one merged files, one regular code
    expect((output.match(/<Codespark/g) || []).length).toBe(2);
    expect(output).toContain('files={');
    expect(output).toContain('code=');
  });

  it('should transform codespark-editor to CodesparkEditor with value prop', () => {
    const input = '```tsx codespark-editor\nexport default () => <div>Hello</div>\n```';
    const output = process(input);
    expect(output).toContain('<CodesparkEditor');
    expect(output).toContain('value={"export default () => <div>Hello</div>"}');
    expect(output).not.toContain('<Codespark ');
  });

  it('should transform codespark-preview to CodesparkPreview with code prop', () => {
    const input = '```tsx codespark-preview\nexport default () => <div>Hello</div>\n```';
    const output = process(input);
    expect(output).toContain('<CodesparkPreview');
    expect(output).toContain('code={"export default () => <div>Hello</div>"}');
    expect(output).not.toContain('<Codespark ');
  });

  it('should pass extra attributes to CodesparkEditor', () => {
    const input = '```tsx codespark-editor height=400 readonly\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('<CodesparkEditor');
    expect(output).toContain('height={400}');
    expect(output).toContain('readonly={true}');
  });

  it('should pass extra attributes to CodesparkPreview', () => {
    const input = '```tsx codespark-preview height=300 showCode\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('<CodesparkPreview');
    expect(output).toContain('height={300}');
    expect(output).toContain('showCode={true}');
  });

  it('should not override value prop in codespark-editor', () => {
    const input = '```tsx codespark-editor value="ignored"\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('<CodesparkEditor');
    expect(output).toContain('value={"export default () => <div />"}');
    expect(output).not.toContain('value="ignored"');
  });

  it('should not override code prop in codespark-preview', () => {
    const input = '```tsx codespark-preview code="ignored"\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('<CodesparkPreview');
    expect(output).toContain('code={"export default () => <div />"}');
    expect(output).not.toContain('code="ignored"');
  });

  it('should ignore file param for codespark-editor', () => {
    const input = '```tsx codespark-editor file="./App.tsx"\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('<CodesparkEditor');
    expect(output).toContain('value=');
    expect(output).not.toContain('files=');
  });

  it('should ignore file param for codespark-preview', () => {
    const input = '```tsx codespark-preview file="./App.tsx"\nexport default () => <div />\n```';
    const output = process(input);
    expect(output).toContain('<CodesparkPreview');
    expect(output).toContain('code=');
    expect(output).not.toContain('files=');
  });

  it('should not merge consecutive codespark-editor blocks', () => {
    const input = `\`\`\`tsx codespark-editor file="./a.tsx"
export const A = () => <div>A</div>
\`\`\`

\`\`\`tsx codespark-editor file="./b.tsx"
export const B = () => <div>B</div>
\`\`\``;
    const output = process(input);
    expect((output.match(/<CodesparkEditor/g) || []).length).toBe(2);
    expect(output).not.toContain('files=');
  });

  it('should not merge consecutive codespark-preview blocks', () => {
    const input = `\`\`\`tsx codespark-preview file="./a.tsx"
export const A = () => <div>A</div>
\`\`\`

\`\`\`tsx codespark-preview file="./b.tsx"
export const B = () => <div>B</div>
\`\`\``;
    const output = process(input);
    expect((output.match(/<CodesparkPreview/g) || []).length).toBe(2);
    expect(output).not.toContain('files=');
  });
});
