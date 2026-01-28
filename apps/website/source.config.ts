import remarkCodespark from '@codespark/plugin-remark';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import lastModified from 'fumadocs-mdx/plugins/last-modified';

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
        light: 'github-light-default'
      },
      parseMetaString(meta) {
        const regex = /(?<=^|\s)(?<name>\w+)(?:=(?:"([^"]*)"|'([^']*)'))?/g;
        const attributes: Record<string, string | null> = {};
        let rest = meta;

        rest = rest.replaceAll(regex, (match, name, value_1, value_2) => {
          const allowedNames = ['jumpTo'];
          if (allowedNames.includes(name)) {
            attributes[name] = value_1 ?? value_2 ?? null;
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
