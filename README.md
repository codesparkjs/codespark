# Codespark

A browser-based React component playground with live preview. Write React code in Monaco editor and see it render instantly in a sandboxed iframe.

## Features

- Monaco editor with syntax highlighting
- Live preview with hot reload
- Tailwind CSS v4 support
- MDX integration via remark plugin
- Sandboxed iframe execution

## Installation

```bash
pnpm add @codespark/react
```

## Usage

```tsx
import { Codespark } from '@codespark/react';
import '@codespark/react/index.css';

function App() {
  return (
    <Codespark
      code={`export default function Demo() {
        return <div>Hello World</div>
      }`}
    />
  );
}
```

## License

MIT
