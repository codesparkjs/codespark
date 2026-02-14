import path from 'node:path';

import codespark from '@codespark/plugin-rollup';
import netlify from '@netlify/vite-plugin';
import netlifyReactRouter from '@netlify/vite-plugin-react-router';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { almostnodePlugin } from 'almostnode/vite';
import mdx from 'fumadocs-mdx/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import * as MdxConfig from './source.config';

export default defineConfig({
  plugins: [
    // 提供 almostnode 的 Service Worker 文件 (/__sw__.js)
    almostnodePlugin(),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    mdx(MdxConfig),
    codespark()
  ],
  resolve: {
    alias: {
      '@codespark/react': path.join(__dirname, '../../packages/react/dist'),
      '@codespark/framework': path.join(__dirname, '../../packages/framework/dist')
    }
  }
});
