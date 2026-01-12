import { CodesparkEditor, CodesparkPreview, CodesparkProvider, Style, useWorkspace } from '@codespark/react';
import CODESPARK_STYLES from '@codespark/react/index.css?raw';
import { Moon, Sun } from 'lucide-react';
import lz from 'lz-string';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';

import type { Route } from './+types/page';
import basicTemplate from './template/basic?raw';

const { decompressFromEncodedURIComponent } = lz;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const imports = url.searchParams.get('imports');

  return {
    code: code ? decompressFromEncodedURIComponent(code) : null,
    imports: (imports ? JSON.parse(decompressFromEncodedURIComponent(imports)) : {}) as Record<string, string>
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
  const { code, imports } = loaderData;
  const { theme, setTheme } = useTheme();
  const [isVertical, setIsVertical] = useState<boolean | null>(null);
  const isDark = theme === 'dark';
  const { workspace } = useWorkspace({ entry: 'App.tsx', files: { 'App.tsx': code ?? basicTemplate } });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsVertical(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsVertical(e.matches);
    mq.addEventListener('change', handler);

    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <CodesparkProvider workspace={workspace} template="react" imports={imports} theme={theme as 'light' | 'dark'}>
      <ResizablePanelGroup className="h-screen" orientation={isVertical ? 'vertical' : 'horizontal'}>
        <ResizablePanel>
          <CodesparkEditor
            wrapperProps={{ className: 'flex-1' }}
            containerProps={{ className: 'flex flex-col' }}
            defaultExpanded
            useToolbox={[
              'reset',
              'format',
              'toggle-sidebar',
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
        <ResizablePanel>
          <CodesparkPreview className="h-full">
            <Style>{CUSTOM_STYLES}</Style>
            <Style type="text/tailwindcss">{CODESPARK_STYLES}</Style>
          </CodesparkPreview>
        </ResizablePanel>
      </ResizablePanelGroup>
    </CodesparkProvider>
  );
}
