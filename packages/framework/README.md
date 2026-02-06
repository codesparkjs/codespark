# @codespark/framework

Core framework abstraction for the [Codespark](https://codesparkjs.com) ecosystem. Provides a unified API for analyzing and compiling code across different frameworks (React, HTML, Markdown).

## Documentation

Visit [https://codesparkjs.com/docs/framework](https://codesparkjs.com/docs/framework) to view the documentation.

## Installation

```bash
npm install @codespark/framework
# or
pnpm add @codespark/framework
```

## Usage

### Using Built-in Frameworks

```ts
import { react } from '@codespark/framework/react';
import { html } from '@codespark/framework/html';
import { markdown } from '@codespark/framework/markdown';

// Analyze and compile React code
const files = {
  './App.tsx': `
    export default function App() {
      return <h1>Hello World</h1>;
    }
  `
};

react.analyze('./App.tsx', files);
const compiled = react.compile();
```

### Registering Frameworks

```ts
import { registerFramework, registry } from '@codespark/framework';
import { react } from '@codespark/framework/react';

// Register a framework
registerFramework(react);

// Get a registered framework
const framework = registry.get('react');

// List all registered frameworks
const frameworks = registry.list(); // ['react']
```

### Creating Custom Frameworks

```ts
import { Framework, type Outputs } from '@codespark/framework';

class MyFramework extends Framework {
  readonly name = 'my-framework';
  readonly imports = {
    'my-lib': 'https://esm.sh/my-lib'
  };
  outputs: Outputs = new Map();

  analyze(entry: string, files: Record<string, string>) {
    // Analyze dependencies and populate outputs
  }

  compile(): string {
    const builder = this.createBuilder();
    // Build runtime code
    return builder.toString();
  }
}
```

## API

### `Framework` (Abstract Class)

Base class for all framework implementations.

| Property/Method | Description |
|-----------------|-------------|
| `name` | Framework identifier |
| `imports` | Import map for external dependencies |
| `outputs` | Analyzed outputs by loader type |
| `analyze(entry, files)` | Analyze entry file and its dependencies |
| `compile()` | Compile analyzed code to executable string |
| `getOutput(type)` | Get outputs for a specific loader type |

### `registerFramework(framework, name?)`

Register a framework instance to the global registry.

### `registry`

Global framework registry instance.

| Method | Description |
|--------|-------------|
| `get(name)` | Get a framework by name |
| `list()` | List all registered framework names |
| `register(framework, name?)` | Register a framework |

### Loader Types

```ts
enum LoaderType {
  ESModule = 'esmodule',  // JavaScript/TypeScript modules
  Style = 'style',        // CSS stylesheets
  Script = 'script',      // Script tags
  Asset = 'asset'         // HTML and other assets
}
```

## Built-in Frameworks

| Framework | Import Path | Description |
|-----------|-------------|-------------|
| React | `@codespark/framework/react` | React with JSX/TSX support |
| HTML | `@codespark/framework/html` | HTML with inline scripts and styles |
| Markdown | `@codespark/framework/markdown` | Markdown to HTML |

## License

MIT
