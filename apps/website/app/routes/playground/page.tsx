import { CodesparkEditor, CodesparkFileExplorer, CodesparkPreview, CodesparkProvider, Style, Workspace } from '@codespark/react';
import CODESPARK_STYLES from '@codespark/react/index.css?raw';
import { ChevronsUpDown, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useMemo, useRef, useState } from 'react';
import { type PanelImperativeHandle, usePanelRef } from 'react-resizable-panels';

import { Button } from '~/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useIsMobile } from '~/hooks/use-mobile';
import { decodeBase64URL, devModuleProxy, isDEV, isSSR } from '~/lib/utils';

import type { Route } from './+types/page';
import { ConsolePanel, type LogEntry, type LogLevel } from './components/console-panel';
import { FileExplorerContextMenu } from './components/context-menu';
import { Toolbox } from './components/toolbox';
import { examples } from './examples';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const boilerplate = url.searchParams.get('boilerplate');
  const defaultCode = examples.basic;

  return {
    code: (code ? await decodeBase64URL(code) : boilerplate ? (examples[boilerplate] ?? '') : null) ?? defaultCode,
    boilerplate
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

const CUSTOM_MOBILE_STYLES = `
#root {
  width: 100%;
}
`;

export default function Playground({ loaderData }: Route.ComponentProps) {
  const { code, boilerplate } = loaderData;
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);
  const [runtimeLogs, setRuntimeLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const fileExplorerPanelRef = usePanelRef();
  const consolePanelRef = usePanelRef();
  const workspace = useMemo(() => new Workspace({ entry: 'App.tsx', files: { 'App.tsx': code } }), []);
  const imports = isDEV && !isSSR ? devModuleProxy(['@codespark/react', '@codespark/framework', '@codespark/framework/markdown', 'react', 'react/jsx-runtime', 'react-dom/client']) : {};

  if (isMobile === null) return <></>;

  const handleTogglePanel = (panel: PanelImperativeHandle | null) => {
    if (!panel) return;

    if (panel.isCollapsed()) {
      panel.resize(isMobile ? 100 : 300);
    } else {
      panel.collapse();
    }
  };

  return (
    <CodesparkProvider workspace={workspace} imports={imports} theme={theme as 'light' | 'dark'}>
      <ResizablePanelGroup className="h-screen">
        <ResizablePanel panelRef={fileExplorerPanelRef} collapsible defaultSize="300px" minSize="200px">
          <FileExplorerContextMenu>
            <CodesparkFileExplorer className="h-full w-full" />
          </FileExplorerContextMenu>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize="400px">
          <ResizablePanelGroup orientation={isMobile ? 'vertical' : 'horizontal'}>
            <ResizablePanel minSize="200px">
              <CodesparkEditor
                id="main"
                containerProps={{ className: 'flex flex-col' }}
                wrapperProps={{ className: 'flex-1' }}
                options={{ fixedOverflowWidgets: true }}
                toolbox={
                  <Toolbox
                    examples={Object.keys(examples)}
                    defaultExample={boilerplate || 'basic'}
                    toggleFileExplorer={() => {
                      handleTogglePanel(fileExplorerPanelRef.current);
                    }}
                    onSelectExample={key => {
                      workspace.setFiles({ 'App.tsx': examples[key] });
                    }}
                  />
                }
                onChange={() => setRuntimeError(null)}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel minSize="200px">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel className="relative">
                  <CodesparkPreview
                    className="h-full"
                    onError={error => setRuntimeError(error as Error)}
                    onConsole={data => {
                      const { level, args = [], duplicate } = data;
                      if (!args.length) return;

                      setRuntimeLogs(prev => {
                        if (duplicate && prev.length > 0) {
                          const last = prev[prev.length - 1];
                          return [...prev.slice(0, -1), { ...last, count: last.count + 1 }];
                        }

                        return [...prev, { id: logIdRef.current++, level: level as LogLevel, args, timestamp: Date.now(), count: 1 }];
                      });
                    }}>
                    <Style>{isMobile ? CUSTOM_MOBILE_STYLES : CUSTOM_STYLES}</Style>
                    <Style type="text/tailwindcss">{CODESPARK_STYLES}</Style>
                  </CodesparkPreview>
                  {runtimeError ? (
                    <div className="bg-background absolute inset-0 z-20 overflow-auto p-6">
                      <div className="text-2xl text-red-500">{runtimeError.name}</div>
                      <div className="mt-3 font-mono">{runtimeError.stack || runtimeError.message}</div>
                    </div>
                  ) : null}
                </ResizablePanel>
                <ResizableHandle className="flex justify-between border-y bg-transparent p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground text-xs font-medium uppercase"
                    onClick={() => {
                      handleTogglePanel(consolePanelRef.current);
                    }}>
                    Console
                    <ChevronsUpDown className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setRuntimeLogs([])}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </ResizableHandle>
                <ResizablePanel panelRef={consolePanelRef} collapsible defaultSize={isMobile ? '0px' : '300px'} maxSize={isMobile ? '200px' : '500px'}>
                  <ConsolePanel logs={runtimeLogs} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </CodesparkProvider>
  );
}
