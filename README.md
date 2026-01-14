# Codespark

A lightweight React playground for live code editing and instant preview in your documentation.

## Features

- Modular architecture with highly customizable component styles
- Components using popular TailwindCSS and shadcn/ui as the design system
- Real-time preview with hot reloading
- Automatic dependency resolution via esm.sh
- Monaco Editor with syntax highlighting and IntelliSense
- MDX and remark plugin integration
- Rollup/Vite plugin for build-time processing

## Installation

```bash
pnpm add @codespark/react
```

## Usage

```tsx
import { Codespark } from '@codespark/react';

const code = `export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Hello World</h1>
      <p>This is my first Codes Park!</p>
    </div>
  );
}`;

export default function App() {
  return <Codespark code={code} />;
}
```

## License

MIT
