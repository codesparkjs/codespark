# Codespark

[![Netlify Status](https://api.netlify.com/api/v1/badges/dca4fbba-de00-485a-8ec2-af401eb97815/deploy-status)](https://app.netlify.com/projects/teal-frangollo-c08833/deploys)

A lightweight React playground for live code editing and instant preview in your documentation.

## Homepage

[CodesparkJS.com](https://codesparkjs.com)

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
