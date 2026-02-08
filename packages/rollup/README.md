# @codespark/plugin-rollup

Rollup/Vite plugin for the [Codespark](https://codesparkjs.com) ecosystem. Automatically collects dependency information from JSX code at build time.

## Documentation

Visit [https://codesparkjs.com/docs/plugin/rollup](https://codesparkjs.com/docs/plugin/rollup) to view the documentation.

## Installation

```bash
npm install @codespark/plugin-rollup
# or
pnpm add @codespark/plugin-rollup
```

## Usage

```ts
// rollup.config.js
import codespark from '@codespark/plugin-rollup';

export default {
  plugins: [codespark()]
};
```

### With Vite

```ts
// vite.config.ts
import codespark from '@codespark/plugin-rollup';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [codespark()]
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the plugin |
| `methods` | `string[]` | `['createWorkspace']` | Method names to transform |
| `importSource` | `string[]` | `['@codespark/react']` | Package names to detect imports from |

```ts
codespark({
  enabled: true,
  methods: ['createWorkspace'],
  importSource: ['@codespark/react']
})
```

## License

MIT
