import path from 'node:path';

import type { Plugin } from 'rollup';

import { transformJsx } from './transform-jsx';

export interface Options {
  enabled?: boolean;
  methods?: string[];
}

export default function rollupPluginCodespark(options?: Options): Plugin {
  const { enabled = true, methods } = options || {};

  return {
    name: 'rollup-plugin-codespark',
    transform: {
      order: 'pre',
      handler(code, id) {
        if (['.js', '.jsx', '.ts', '.tsx'].includes(path.extname(id)) && enabled) {
          const transformed = transformJsx(code, id, { methods });

          if (transformed) return { code: transformed };
        }

        return null;
      }
    }
  };
}
