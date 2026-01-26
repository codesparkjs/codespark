import { copyFileSync } from 'node:fs';

import importRaw from 'rollup-plugin-import-raw';
import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: { index: 'src/index.tsx' },
    dts: true,
    platform: 'browser',
    plugins: [importRaw()],
    onSuccess: () => {
      copyFileSync('src/index.css', 'dist/index.css');
    }
  },
  {
    entry: { monaco: 'src/components/editor/monaco/index.tsx' },
    dts: true,
    platform: 'browser'
  }
]);
