import { defineConfig } from 'tsdown';

export default defineConfig([
  { entry: { index: 'src/index.ts' }, dts: true, platform: 'node' },
  { entry: { browser: 'src/analyze-refs.ts' }, dts: true, platform: 'browser' }
]);
