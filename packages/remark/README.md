# @codespark/plugin-remark

Remark plugin for the [Codespark](https://codesparkjs.com) ecosystem. Transforms code blocks with codespark directives into JSX components in MDX files.

## Documentation

Visit [https://codesparkjs.com/docs/plugin/remark](https://codesparkjs.com/docs/plugin/remark) to view the documentation.

## Installation

```bash
npm install @codespark/plugin-remark
# or
pnpm add @codespark/plugin-remark
```

## Usage

```ts
import remarkCodespark from '@codespark/plugin-remark';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkCodespark);
```

## Directives

Use directives in code block meta to transform them into Codespark components:

### `codespark`

Transforms into `<Codespark>` component with editor and preview.

````md
```tsx codespark
export default function App() {
  return <h1>Hello World</h1>;
}
```
````

### `codespark-editor`

Transforms into `<CodesparkEditor>` component (editor only).

````md
```tsx codespark-editor
const greeting = "Hello";
```
````

### `codespark-preview`

Transforms into `<CodesparkPreview>` component (preview only).

````md
```tsx codespark-preview
export default function App() {
  return <h1>Hello World</h1>;
}
```
````

### Multi-file Support

Use the `file` attribute to create multi-file playgrounds:

````md
```tsx codespark file="./App.tsx"
import { Button } from './Button';
export default function App() {
  return <Button>Click me</Button>;
}
```

```tsx codespark file="./Button.tsx"
export function Button({ children }) {
  return <button>{children}</button>;
}
```
````

## License

MIT
