import remarkCodespark from '@codespark/plugin-remark';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import lastModified from 'fumadocs-mdx/plugins/last-modified';
import { transformerTwoslash } from 'fumadocs-twoslash';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    postprocess: {
      includeProcessedMarkdown: true
    }
  }
});

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: {
    providerImportSource: '@codespark/react',
    remarkPlugins: [remarkCodespark],
    rehypeCodeOptions: {
      themes: {
        dark: 'github-dark',
        light: 'github-light'
      },
      transformers: [...(rehypeCodeDefaultOptions.transformers ?? []), transformerTwoslash()],
      langs: ['js', 'jsx', 'ts', 'tsx'],
      parseMetaString(meta) {
        const regex = /(?<=^|\s)(?<name>\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
        const attributes: Record<string, string | boolean> = {};
        let rest = meta;

        rest = rest.replaceAll(regex, (match, name, value_1, value_2, value_3) => {
          const allowedNames = ['preview', 'height', 'title'];
          if (allowedNames.includes(name)) {
            const value = value_1 ?? value_2 ?? value_3;
            if (value === undefined) {
              attributes[name] = true;
            } else {
              attributes[name] = value;
            }
            return '';
          }
          return match;
        });

        rest = rest.replace(/lineNumbers=(\d+)|lineNumbers/, (_, start) => {
          attributes['data-line-numbers'] = 'true';
          if (start !== undefined) {
            attributes['data-line-numbers-start'] = start;
          }
          return '';
        });

        attributes['__parsed_raw'] = rest;
        return attributes;
      }
    }
  }
});
