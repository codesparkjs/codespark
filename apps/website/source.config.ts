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
    remarkPlugins: [remarkCodespark]
  }
});
