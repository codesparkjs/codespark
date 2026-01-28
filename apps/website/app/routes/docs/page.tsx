import { ConfigProvider } from '@codespark/react';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import browserCollections from 'fumadocs-mdx:collections/browser';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsDescription, DocsPage, DocsTitle, PageLastUpdate } from 'fumadocs-ui/layouts/docs/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { useTheme } from 'next-themes';
import { type HTMLAttributes, useRef } from 'react';
import { useNavigate } from 'react-router';

import { LLMCopyButton, ViewOptions } from '~/components/ai/page-actions';
import { Icons } from '~/components/icons';
import { mdxComponents } from '~/components/mdx-components';
import { Button } from '~/components/ui/button';
import { source } from '~/lib/source';
import { cn, encodeBase64URL } from '~/lib/utils';

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
              ...mdxComponents,
              CodeBlockTabs: ({ className, ...props }) => {
                return <defaultMdxComponents.CodeBlockTabs {...props} className={cn(className, 'bg-code rounded-lg border-none')} />;
              },
              pre: (props: HTMLAttributes<HTMLPreElement>) => {
                const pre = useRef<HTMLPreElement>(null);
                const navigate = useNavigate();

                return (
                  <CodeBlock
                    {...props}
                    Actions={({ className, children }) => {
                      return (
                        <div className={cn('flex items-center pr-1.5', className)}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={async () => {
                              const code = pre.current?.textContent;

                              if (code) {
                                navigate({
                                  pathname: '/playground',
                                  search: `?code=${await encodeBase64URL(code)}&embedded`
                                });
                              }
                            }}>
                            <Icons.logo className="size-4" />
                          </Button>
                          {children}
                        </div>
                      );
                    }}>
                    <Pre ref={pre}>{props.children}</Pre>
                  </CodeBlock>
                );
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
      <DocsLayout tree={pageTree} themeSwitch={{ enabled: false }} searchToggle={{ enabled: false }} sidebar={{ collapsible: false }}>
        <Content url={url} path={path} lastModified={lastModified} />
      </DocsLayout>
    </ConfigProvider>
  );
}
