import { defineConfig } from 'tsdown';

export default defineConfig([
  { entry: { index: 'src/index.ts' }, dts: true, platform: 'browser' },
  { entry: { react: 'src/react-new/index.ts' }, dts: true, platform: 'browser', external: ['@codespark/framework'] },
  { entry: { markdown: 'src/markdown-new/index.ts' }, dts: true, platform: 'browser', external: ['@codespark/framework'] }
]);
