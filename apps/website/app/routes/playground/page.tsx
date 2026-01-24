import { CodesparkEditor, CodesparkFileExplorer, CodesparkPreview, CodesparkProvider, Style, Workspace } from '@codespark/react';
import CODESPARK_STYLES from '@codespark/react/index.css?raw';
import { ChevronsUpDown, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type PanelImperativeHandle, usePanelRef } from 'react-resizable-panels';

import { Button } from '~/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { useIsMobile } from '~/hooks/use-mobile';
import { decodeBase64URL, devModuleProxy, isDEV, isSSR } from '~/lib/utils';

import type { Route } from './+types/page';
import { ConsolePanel, type LogEntry, type LogLevel } from './components/console-panel';
import { FileExplorerContextMenu } from './components/context-menu';
import { Toolbox } from './components/toolbox';

interface ExampleMeta {
  name: string;
  title: string;
  embedded: boolean;
}

const getEmbeddedCode = (files: Record<string, string>) => {
  return `import { Codespark } from '@codespark/react';

const files = ${JSON.stringify(files, null, 2)};

export default function App() {
  return <Codespark files={files} />;
}`;
};

const getExamplesList = async (origin: string): Promise<ExampleMeta[]> => {
  const res = await fetch(new URL('/examples', origin));
  if (!res.ok) return [];

  return res.json();
};

const getExample = async (origin: string, name: string): Promise<Record<string, string> | null> => {
  const res = await fetch(new URL(`/examples/${name}`, origin));
  if (!res.ok) return null;

  return res.json();
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const boilerplate = url.searchParams.get('boilerplate');
  const embedded = Boolean(url.searchParams.get('embedded'));
  const examples = await getExamplesList(url.origin);
  const meta = examples.find(({ name }) => name === (boilerplate || examples[0]?.name));

  let files: Record<string, string> = { './App.tsx': '' };
  if (code) {
    files = { './App.tsx': (await decodeBase64URL(code)) || '' };
  } else if (meta) {
    const example = (await getExample(url.origin, meta.name)) ?? { './App.tsx': '' };
    files = embedded && meta.embedded ? { './App.tsx': getEmbeddedCode(example) } : example;
  }

  return { files, examples, boilerplate: meta, embedded };
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
  const imports = isDEV && !isSSR ? devModuleProxy(['@codespark/react', '@codespark/framework', '@codespark/framework/markdown', 'react', 'react/jsx-runtime', 'react-dom/client']) : {};

  useEffect(() => {
    if (!example) return;

    getExample(location.origin, example).then(files => {
      if (!files) return;

      const canEmbedded = examples.find(e => e.name === example)?.embedded;
      workspace.setFiles(embedded && canEmbedded ? { './App.tsx': getEmbeddedCode(files) } : files);
    });
  }, [example, embedded]);

  if (isMobile === null) return null;

  const togglePanel = (panel: PanelImperativeHandle | null) => {
    if (!panel) return;

    void (panel.isCollapsed() ? panel.resize(isMobile ? 100 : 300) : panel.collapse());
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
                onChange={() => setRuntimeError(null)}
                toolbox={
                  <Toolbox toggleFileExplorer={() => togglePanel(fileExplorerPanelRef.current)} embedded={embedded} onToggleEmbedded={setEmbedded}>
                    <Select value={example} onValueChange={setExample}>
                      <SelectTrigger className="w-50">
                        <SelectValue placeholder="Select an example..." />
                      </SelectTrigger>
                      <SelectContent>
                        {examples.map(({ name, title }) => (
                          <SelectItem key={name} value={name}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Toolbox>
                }
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
                  {runtimeError && (
                    <div className="bg-background absolute inset-0 z-20 overflow-auto p-6">
                      <div className="text-2xl text-red-500">{runtimeError.name}</div>
                      <div className="mt-3 font-mono">{runtimeError.stack || runtimeError.message}</div>
                    </div>
                  )}
                </ResizablePanel>
                <ResizableHandle className="flex justify-between border-y bg-transparent p-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-medium uppercase" onClick={() => togglePanel(consolePanelRef.current)}>
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
