import { copyFileSync } from 'node:fs';

import importRaw from 'rollup-plugin-import-raw';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.tsx',
  platform: 'browser',
  plugins: [importRaw()],
  onSuccess: () => {
    copyFileSync('src/index.css', 'dist/index.css');
  }
});
