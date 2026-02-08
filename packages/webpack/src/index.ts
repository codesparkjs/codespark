import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Compiler } from 'webpack';

export interface Options {
  enabled?: boolean;
  methods?: string[];
}

const __dir = path.dirname(fileURLToPath(import.meta.url));
const loaderPath = path.resolve(__dir, 'loader.mjs');

export default class CodesparkWebpackPlugin {
  private enabled: boolean;
  private methods?: string[];

  constructor(options?: Options) {
    const { enabled = true, methods } = options || {};
    this.enabled = enabled;
    this.methods = methods;
  }

  apply(compiler: Compiler) {
    if (!this.enabled) return;

    compiler.options.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: /node_modules/,
      enforce: 'pre' as const,
      use: [
        {
          loader: loaderPath,
          options: { methods: this.methods }
        }
      ]
    });
  }
}
