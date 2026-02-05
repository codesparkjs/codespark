import { ConfigProvider } from '@codespark/react';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import browserCollections from 'fumadocs-mdx:collections/browser';
import * as Twoslash from 'fumadocs-twoslash/ui';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsDescription, DocsPage, DocsTitle, PageLastUpdate } from 'fumadocs-ui/layouts/docs/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Boxes, Layers } from 'lucide-react';
import { useTheme } from 'next-themes';

import { LLMCopyButton, ViewOptions } from '~/components/ai/page-actions';
import { Icons } from '~/components/icons';
import { mdxComponents } from '~/components/mdx-components';
import { source } from '~/lib/source';
import { cn } from '~/lib/utils';

import type { Route } from './+types/page';

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter(v => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    url: page.url,
    path: page.path,
    pageTree: await source.serializePageTree(source.getPageTree()),
    lastModified: page.data.lastModified
  };
}

const clientLoader = browserCollections.docs.createClientLoader<{ url: string; path: string; lastModified?: Date }>({
  component({ toc, default: Mdx, frontmatter }, { url, path, lastModified }) {
    const markdownUrl = `${url === '/docs' ? '/docs/' : url}.mdx`;

    return (
      <DocsPage toc={toc} tableOfContent={{ style: 'clerk' }}>
        <title>{frontmatter.title}</title>
        <meta name="description" content={frontmatter.description} />
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
          <LLMCopyButton markdownUrl={markdownUrl} />
          <ViewOptions markdownUrl={markdownUrl} githubUrl={`https://github.com/codesparkjs/codespark/blob/main/apps/website/content/docs/${path}`} />
        </div>
        <DocsBody>
          <Mdx
            components={{
              ...defaultMdxComponents,
              ...Twoslash,
              ...TabsComponents,
              ...mdxComponents,
              CodeBlockTabs: ({ className, ...props }) => {
                return <defaultMdxComponents.CodeBlockTabs {...props} className={cn(className, 'bg-code rounded-lg border-none')} />;
              },
              CodeBlockTabsList: ({ className, ...props }) => {
                return <defaultMdxComponents.CodeBlockTabsList {...props} className={cn(className, 'border-b pt-2')} />;
              },
              Tabs: ({ className, ...props }) => {
                return <TabsComponents.Tabs {...props} className={cn(className, 'rounded-lg')} />;
              },
              Tab: ({ className, ...props }) => {
                return <TabsComponents.Tab {...props} className={cn(className, 'm-1 mt-0 rounded-lg')} />;
              }
            }}
          />
        </DocsBody>
        {lastModified && <PageLastUpdate date={lastModified} />}
      </DocsPage>
    );
  }
});

export default function Docs({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { url, path, lastModified } = loaderData;
  const Content = clientLoader.getComponent(loaderData.path);
  const { pageTree } = useFumadocsLoader({ pageTree: loaderData.pageTree });
  const { theme } = useTheme();

  return (
    <ConfigProvider theme={theme as 'light' | 'dark'}>
      <DocsLayout
        tree={pageTree}
        themeSwitch={{ enabled: false }}
        searchToggle={{ enabled: false }}
        sidebar={{
          collapsible: false,
          tabs: [
            {
              title: 'Codespark React',
              description: 'The core components',
              url: '/docs',
              icon: <Icons.react className="size-5" />
            },
            {
              title: 'Codespark Framework',
              description: 'Framework adapters',
              url: '/docs/framework',
              icon: <Layers className="size-5" />
            },
            {
              title: 'Codespark Plugin',
              description: 'Code transforming tools',
              url: '/docs/plugin',
              icon: <Boxes className="size-5" />
            }
          ]
        }}>
        <Content url={url} path={path} lastModified={lastModified} />
      </DocsLayout>
    </ConfigProvider>
  );
}
