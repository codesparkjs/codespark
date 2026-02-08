import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    loader: 'src/loader.ts'
  },
  format: ['esm', 'cjs'],
  dts: true
});
