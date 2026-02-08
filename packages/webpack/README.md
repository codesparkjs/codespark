# @codespark/plugin-webpack

Webpack plugin for the [Codespark](https://codesparkjs.com) ecosystem. Automatically collects dependency information from JSX code at build time.

## Documentation

Visit [https://codesparkjs.com/docs/plugin/webpack](https://codesparkjs.com/docs/plugin/webpack) to view the documentation.

## Installation

```bash
npm install @codespark/plugin-webpack
# or
pnpm add @codespark/plugin-webpack
```

## Usage

### Webpack

```js
// webpack.config.js
import CodesparkWebpackPlugin from '@codespark/plugin-webpack';

export default {
  plugins: [
    new CodesparkWebpackPlugin()
  ]
};
```

### Next.js (Webpack)

```js
// next.config.ts
import type { NextConfig } from 'next';
import CodesparkWebpackPlugin from '@codespark/plugin-webpack';

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.plugins.push(new CodesparkWebpackPlugin());

    return config;
  }
};

export default nextConfig;
```

### Next.js (Turbopack)

```ts
// next.config.ts
const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      '*.tsx': {
        loaders: [
          {
            loader: '@codespark/plugin-webpack/loader'
          }
        ]
      }
    }
  }
};

export default nextConfig;
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the plugin |
| `methods` | `string[]` | `['createWorkspace']` | Method names to transform |
| `importSource` | `string[]` | `['@codespark/react']` | Package names to detect imports from |

```js
new CodesparkWebpackPlugin({
  enabled: true,
  methods: ['createWorkspace'],
  importSource: ['@codespark/react']
})
```

## License

MIT
