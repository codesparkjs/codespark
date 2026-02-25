import { copyFileSync } from 'node:fs';

import importRaw from 'rollup-plugin-import-raw';
import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: { index: 'src/index.tsx' },
    platform: 'browser',
    external: ['monaco-editor'],
    plugins: [importRaw()],
    onSuccess: () => {
      copyFileSync('src/index.css', 'dist/index.css');
    }
  },
  {
    entry: { monaco: 'src/components/editor/monaco/index.tsx' },
    external: ['monaco-editor'],
    platform: 'browser'
  },
  {
    entry: { codemirror: 'src/components/editor/codemirror/index.tsx' },
    external: ['monaco-editor'],
    platform: 'browser'
  }
]);
