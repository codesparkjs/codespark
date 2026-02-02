import { defineConfig } from 'tsdown';

export default defineConfig([
  { entry: { index: 'src/index.ts' }, dts: true, platform: 'browser' },
  { entry: { react: 'src/react/index.ts' }, dts: true, platform: 'browser', external: ['@codespark/framework'] },
  { entry: { markdown: 'src/markdown/index.ts' }, dts: true, platform: 'browser', external: ['@codespark/framework'] }
]);
