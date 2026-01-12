import importRaw from 'rollup-plugin-import-raw';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  platform: 'browser',
  plugins: [importRaw()]
});
