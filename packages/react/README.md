# @codespark/react

React components for the Codespark ecosystem - a lightweight React playground for live code editing and instant preview.

## Documentation

Visit [https://codesparkjs.com/docs](https://codesparkjs.com/docs) to view the documentation.

## Features

- Real-time preview with hot reloading
- Monaco Editor and CodeMirror support with syntax highlighting
- Single-file and multi-file mode
- Automatic dependency resolution via esm.sh
- TailwindCSS support in preview
- Customizable layout (vertical/horizontal orientation)
- File explorer for multi-file projects

## Installation

```bash
pnpm add @codespark/react
```

## Usage

### Basic Usage

```tsx
import { Codespark } from '@codespark/react';
import '@codespark/react/index.css';

const code = `export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Hello World</h1>
    </div>
  );
}`;

export default function Demo() {
  return <Codespark code={code} />;
}
```

### Multi-file Mode

```tsx
import { Codespark } from '@codespark/react';

const files = {
  './App.tsx': `import { Button } from './Button';
export default function App() {
  return <Button>Click me</Button>;
}`,
  './Button.tsx': `export function Button({ children }) {
  return <button className="btn">{children}</button>;
}`
};

export default function Demo() {
  return <Codespark files={files} name="./App.tsx" />;
}
```

### With TailwindCSS

```tsx
<Codespark code={code} tailwindcss />
```

### Horizontal Layout

```tsx
<Codespark code={code} orientation="horizontal" />
```

### Custom Height

```tsx
<Codespark code={code} editorHeight={300} previewHeight="50%" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | - | Source code for single-file mode |
| `files` | `Record<string, string>` | - | File mapping for multi-file mode |
| `name` | `string` | `'./App.tsx'` | Entry file path |
| `theme` | `string` | - | Editor theme |
| `framework` | `string` | `'react'` | Framework type |
| `showEditor` | `boolean` | `true` | Show code editor |
| `showPreview` | `boolean` | `true` | Show preview area |
| `showFileExplorer` | `boolean` | `true` | Show file explorer |
| `readonly` | `boolean` | `false` | Read-only mode |
| `editorHeight` | `string \| number` | `200` | Editor height |
| `previewHeight` | `string \| number` | `200` | Preview height |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout orientation |
| `tailwindcss` | `boolean` | - | Enable TailwindCSS in preview |
| `editor` | `CodesparkEditorEngineComponents` | CodeMirror | Editor engine (Monaco/CodeMirror) |

## Exports

- `Codespark` - Main playground component
- `CodesparkEditor` - Standalone editor component
- `CodesparkPreview` - Standalone preview component
- `CodesparkFileExplorer` - File explorer component
- `CodesparkProvider` - Context provider
- `useWorkspace` - Hook for workspace management
- `EditorEngine` - Editor engine enum (Monaco/CodeMirror)

## License

MIT
