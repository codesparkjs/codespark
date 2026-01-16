'use client';

import { CodesparkEditor, CodesparkFileExplorer, CodesparkPreview, CodesparkProvider, Style, useWorkspace } from '@codespark/react';
import CODESPARK_STYLES from '@codespark/react/index.css?raw';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { decodeBase64URL, devModuleProxy, isDEV, isSSR } from '~/lib/utils';

import type { Route } from './+types/page';
import { template } from './template';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const boilerplate = url.searchParams.get('boilerplate');

  return {
    code: code ? await decodeBase64URL(code) : boilerplate ? (template[boilerplate] ?? '') : null
  };
}

export function meta() {
  return [{ title: 'Playground - codespark' }, { name: 'description', content: 'Edit and preview code in real-time.' }];
}

const CUSTOM_STYLES = `
#root {
  width: 70%;
  min-width: 600px;
}
`;

export default function Playground({ loaderData }: Route.ComponentProps) {
  const { code } = loaderData;
  const { theme, setTheme } = useTheme();
  const [isVertical, setIsVertical] = useState<boolean | null>(null);
  const isDark = theme === 'dark';
  const { workspace } = useWorkspace({ entry: 'App.tsx', files: { 'App.tsx': code ?? template.basic, './src/index.tsx': 'export const Button = () => <button>ok</button>;' } });
  const imports = isDEV && !isSSR ? devModuleProxy(['@codespark/react', 'react', 'react/jsx-runtime', 'react-dom/client']) : {};

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsVertical(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsVertical(e.matches);
    mq.addEventListener('change', handler);

    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isVertical === null) return <></>;

  return (
    <CodesparkProvider workspace={workspace} template="react" imports={imports} theme={theme as 'light' | 'dark'}>
      <ResizablePanelGroup className="h-screen">
        <ResizablePanel collapsible defaultSize="300px" minSize="200px">
          <CodesparkFileExplorer className="h-full w-full" />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize="400px">
          <ResizablePanelGroup orientation={isVertical ? 'vertical' : 'horizontal'}>
            <ResizablePanel minSize="200px">
              <CodesparkEditor
                containerProps={{ className: 'flex flex-col' }}
                wrapperProps={{ className: 'flex-1 pr-3' }}
                useToolbox={[
                  'reset',
                  'format',
                  'copy',
                  {
                    tooltip: isDark ? 'dark' : 'light',
                    icon: isDark ? <Moon className="size-3.5!" /> : <Sun className="size-3.5!" />,
                    onClick: () => setTheme(isDark ? 'light' : 'dark')
                  }
                ]}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel minSize="200px">
              <CodesparkPreview className="h-full">
                <Style>{CUSTOM_STYLES}</Style>
                <Style type="text/tailwindcss">{CODESPARK_STYLES}</Style>
              </CodesparkPreview>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </CodesparkProvider>
  );
}
