import { defineConfig } from 'tsdown';

export default defineConfig([
  { entry: { index: 'src/index.ts' }, dts: true, platform: 'browser' },
  { entry: { react: 'src/react/index.ts' }, dts: true, platform: 'browser', external: ['@codespark/framework'] },
  { entry: { markdown: 'src/markdown/index.ts' }, dts: true, platform: 'browser', external: ['@codespark/framework'] },
  { entry: { html: 'src/html/index.ts' }, dts: true, platform: 'browser', external: ['@codespark/framework'] },
  { entry: { node: 'src/node/index.ts' }, dts: true, platform: 'browser', external: ['@codespark/framework', 'almostnode'] },
  { entry: { loaders: 'src/loaders/index.ts' }, dts: true, platform: 'browser' }
]);
