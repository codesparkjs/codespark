import codespark from '@codespark/plugin-rollup';
import netlify from '@netlify/vite-plugin';
import netlifyReactRouter from '@netlify/vite-plugin-react-router';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import mdx from 'fumadocs-mdx/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import * as MdxConfig from './source.config';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), netlifyReactRouter(), netlify(), mdx(MdxConfig), codespark()],
  resolve: {
    conditions: ['development', 'import']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
