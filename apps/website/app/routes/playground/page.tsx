import { CodesparkEditor, CodesparkFileExplorer, CodesparkPreview, CodesparkProvider, Link, Style, Workspace } from '@codespark/react';
import CODESPARK_STYLES from '@codespark/react/index.css?raw';
import { Monaco } from '@codespark/react/monaco';
import { ChevronsUpDown, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type PanelImperativeHandle, usePanelRef } from 'react-resizable-panels';

import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Sidebar, SidebarContent, SidebarProvider } from '~/components/ui/sidebar';
import { Switch } from '~/components/ui/switch';
import { useIsMobile } from '~/hooks/use-mobile';
import { useUpdateEffect } from '~/hooks/use-update-effect';
import { decodeBase64URL, devModuleProxy, isDEV, isSSR } from '~/lib/utils';

import type { Route } from './+types/page';
import { ConsolePanel, type LogEntry, type LogLevel } from './components/console-panel';
import { FileExplorerContextMenu } from './components/context-menu';
import { Toolbox } from './components/toolbox';

interface ExampleMeta {
  name: string;
  title: string;
  raw: boolean;
}

const getExamplesList = async (origin: string): Promise<ExampleMeta[]> => {
  const res = await fetch(new URL('/examples', origin));
  if (!res.ok) return [];

  return res.json();
};

const getExample = async (origin: string, name: string): Promise<{ raw?: Record<string, string>; embedded: Record<string, string> } | null> => {
  const res = await fetch(new URL(`/examples/${name}`, origin));
  if (!res.ok) return null;

  return res.json();
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const boilerplate = url.searchParams.get('boilerplate');
  const embedded = url.searchParams.get('embedded') === null ? false : true;
  const examples = await getExamplesList(url.origin);
  const meta = examples.find(({ name }) => name === (boilerplate || examples[0]?.name));

  let files: Record<string, string>;
  if (code) {
    files = { './App.tsx': (await decodeBase64URL(code)) || '' };
  } else if (meta) {
    const { raw: rawFiles, embedded: embeddedFiles } = (await getExample(url.origin, meta.name)) || {};
    files = (!embedded && rawFiles && meta.raw ? rawFiles : embeddedFiles) || { './App.tsx': '' };
  } else {
    files = { './App.tsx': '' };
  }

  return { files, examples, boilerplate: code ? void 0 : meta, embedded };
}

export function meta() {
  return [{ title: 'Playground - codespark' }, { name: 'description', content: 'Edit and preview code in real-time.' }];
}

const CUSTOM_STYLES = '#root { width: 70%; min-width: 600px; }';
const CUSTOM_MOBILE_STYLES = '#root { width: 100%; }';

export default function Playground({ loaderData }: Route.ComponentProps) {
  const { files, examples, boilerplate } = loaderData;
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);
  const [runtimeLogs, setRuntimeLogs] = useState<LogEntry[]>([]);
  const [example, setExample] = useState(boilerplate?.name);
  const [embedded, setEmbedded] = useState(loaderData.embedded);
  const logIdRef = useRef(0);
  const fileExplorerPanelRef = usePanelRef();
  const consolePanelRef = usePanelRef();
  const workspace = useMemo(() => new Workspace({ entry: './App.tsx', files }), []);
  const imports = isDEV && !isSSR ? devModuleProxy(['@codespark/react', '@codespark/framework', '@codespark/framework/markdown', '@codespark/react/monaco', '@codespark/react/codemirror', 'react', 'react/jsx-runtime', 'react-dom/client']) : {};
  const hasRaw = examples.find(e => e.name === example)?.raw ?? !!boilerplate;

  useUpdateEffect(() => {
    if (!example) return;

    getExample(location.origin, example).then(files => {
      if (!files) return;

      const { raw: rawFiles, embedded: embeddedFiles } = files;
      workspace.setFiles(!embedded && rawFiles && hasRaw ? rawFiles : embeddedFiles);
    });
  }, [example, embedded]);

  useEffect(() => {
    workspace.on('compileError', error => {
      setRuntimeError(error);
    });
  }, []);

  if (isMobile === null) return null;

  const togglePanel = (panel: PanelImperativeHandle | null) => {
    if (!panel) return;

    void (panel.isCollapsed() ? panel.resize(isMobile ? 100 : 300) : panel.collapse());
  };

  return (
    <SidebarProvider>
      <CodesparkProvider workspace={workspace} imports={imports} theme={theme as 'light' | 'dark'}>
        <ResizablePanelGroup className="h-screen">
          <ResizablePanel panelRef={fileExplorerPanelRef} collapsible={isMobile} defaultSize="300px" minSize="200px">
            <Sidebar collapsible={isMobile ? 'offcanvas' : 'none'} className="w-full">
              <SidebarContent>
                <FileExplorerContextMenu>
                  <CodesparkFileExplorer className="h-full w-full" />
                </FileExplorerContextMenu>
              </SidebarContent>
            </Sidebar>
          </ResizablePanel>
          {isMobile ? null : <ResizableHandle />}
          <ResizablePanel minSize="400px">
            <ResizablePanelGroup orientation={isMobile ? 'vertical' : 'horizontal'}>
              <ResizablePanel minSize="200px" className="flex flex-col divide-y">
                <Toolbox example={example}>
                  <Select value={example} onValueChange={setExample}>
                    <SelectTrigger className="w-60">
                      <SelectValue placeholder="Select an example..." />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6}>
                      {examples.map(({ name, title }) => (
                        <SelectItem key={name} value={name}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Toolbox>
                <CodesparkEditor
                  id="main"
                  editor={Monaco}
                  containerProps={{ className: 'flex-1' }}
                  wrapperProps={{ className: 'h-full!' }}
                  options={{ fixedOverflowWidgets: true }}
                  onChange={() => {
                    setRuntimeError(null);
                  }}
                  toolbox={false}
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
                      <Link rel="preconnect" href="https://fonts.googleapis.com" />
                      <Link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                      <Link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap" />
                      <Style>{isMobile ? CUSTOM_MOBILE_STYLES : CUSTOM_STYLES}</Style>
                      <Style type="text/tailwindcss">{CODESPARK_STYLES}</Style>
                    </CodesparkPreview>
                    {runtimeError && (
                      <div className="bg-background absolute inset-0 z-20 overflow-auto p-6">
                        <div className="text-2xl text-red-500">{runtimeError.name}</div>
                        <div className="mt-3 font-mono">{runtimeError.stack || runtimeError.message}</div>
                      </div>
                    )}
                  </ResizablePanel>
                  <ResizableHandle className="flex justify-between border-y bg-transparent p-2">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-medium uppercase" onClick={() => togglePanel(consolePanelRef.current)}>
                        Console
                        <ChevronsUpDown className="size-3.5" />
                      </Button>
                      <Switch id="embedded" disabled={!hasRaw} size="sm" checked={hasRaw ? embedded : true} onCheckedChange={setEmbedded} />
                      <Label htmlFor="embedded" className="text-muted-foreground text-xs font-medium">
                        Embedded
                      </Label>
                    </div>
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
    </SidebarProvider>
  );
}
