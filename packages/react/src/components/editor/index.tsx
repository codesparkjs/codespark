'use client';

import { Braces, Check, ChevronRight, Codepen, Copy, Maximize, RefreshCw, RemoveFormatting } from 'lucide-react';
import type * as monaco from 'monaco-editor';
import { type ComponentProps, isValidElement, type ReactElement, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWorkspace, Workspace } from '@/lib/workspace';

import { type ConfigProviderProps, useCodespark, useConfig } from '../context';
import { getIconForLanguageExtension } from './icons';
import { AVAILABLE_THEMES, Monaco, type MonacoProps } from './monaco';

const useCopyToClipboard = (timeout = 2000) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), timeout);
    },
    [timeout]
  );

  return { copyToClipboard, isCopied };
};

type ToolboxItemId = 'reset' | 'format' | 'toggle-sidebar' | 'copy';

interface ToolboxContext {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  workspace: Workspace;
  currentFile: { path: string; code: string };
}

interface ToolboxItemConfig {
  tooltip?: string;
  icon?: ReactNode;
  onClick?: (ctx: ToolboxContext) => void;
  render?: (ctx: ToolboxContext) => ReactNode;
}

const dtsCacheMap = new Map<string, string>();

export interface CodesparkEditorProps extends Pick<ConfigProviderProps, 'theme'>, Pick<MonacoProps, 'options' | 'width' | 'height' | 'onChange' | 'onMount' | 'className'> {
  value?: string;
  workspace?: Workspace;
  useToolbox?: boolean | (ToolboxItemId | ToolboxItemConfig | ReactElement)[];
  useOPFS?: boolean;
  defaultExpanded?: boolean;
  wrapperProps?: ComponentProps<'section'>;
  containerProps?: ComponentProps<'div'>;
}

export function CodesparkEditor(props: CodesparkEditorProps) {
  const { theme: globalTheme } = useConfig();
  const { workspace: contextWorkspace, theme: contextTheme } = useCodespark();
  const {
    value = '',
    workspace = contextWorkspace ?? new Workspace({ entry: 'App.tsx', files: { 'App.tsx': '' } }),
    theme = contextTheme ?? globalTheme ?? 'light',
    options,
    width,
    height = 200,
    className,
    useToolbox = true,
    useOPFS = false,
    defaultExpanded,
    wrapperProps,
    containerProps,
    onChange
  } = props;
  const { entryFile, depFiles, internalDeps, externalDeps, imports } = useWorkspace(workspace);
  const [currentFile, setCurrentFile] = useState(entryFile);
  const [expanded, setExpanded] = useState(defaultExpanded ?? depFiles.length > 0);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const [dts, setDts] = useState<Record<string, string>>(() => {
    const internalDts = Object.fromEntries(internalDeps.map(({ alias, dts }) => [alias, dts]));
    const externalDts = Object.fromEntries(externalDeps.map(({ name }) => [name, '']));

    return { ...internalDts, ...externalDts };
  });
  const toolboxItems: Record<ToolboxItemId, ToolboxItemConfig> = {
    reset: {
      tooltip: 'Reset Document',
      icon: <RefreshCw className="size-3.5!" />,
      onClick: () => {
        const { path } = currentFile;
        const originalCode = workspace.getOriginalCode(path) ?? '';
        editorRef.current?.getModel()?.setValue(originalCode);
        workspace.setFile(path, originalCode);
      }
    },
    format: {
      tooltip: 'Format Document',
      icon: <RemoveFormatting className="size-3.5!" />,
      onClick: () => {
        editorRef.current?.getAction('editor.action.formatDocument')?.run();
      }
    },
    'toggle-sidebar': {
      tooltip: 'Toggle Sidebar',
      icon: <Maximize className="size-3.5!" />,
      onClick: () => setExpanded(v => !v)
    },
    copy: {
      tooltip: isCopied ? 'Copied' : 'Copy to Clipboard',
      icon: isCopied ? <Check className="size-3.5!" /> : <Copy className="size-3.5!" />,
      onClick: () => {
        const content = editorRef.current?.getModel()?.getValue() || '';
        copyToClipboard(content);
      }
    }
  };

  useEffect(() => {
    if (!value) return;

    workspace.setFile(entryFile.path, value);
  }, [value]);

  useEffect(() => {
    if (useOPFS) {
      workspace.initOPFS();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    Promise.all(
      Object.entries(imports).map(async ([name, url]) => {
        if (dtsCacheMap.has(name)) return [name, dtsCacheMap.get(name)!];

        const { headers } = await fetch(url, { method: 'HEAD' });
        const dtsUrl = headers.get('X-TypeScript-Types');
        if (dtsUrl) {
          const dtsContent = await fetch(dtsUrl).then(r => r.text());
          dtsCacheMap.set(name, dtsContent);
          return [name, dtsContent];
        }

        return [];
      })
    ).then(results => {
      setDts(prev => ({ ...prev, ...Object.fromEntries(results) }));
    });
  }, [imports]);

  return (
    <div className="flex h-full w-full divide-x">
      {expanded ? (
        <Tabs className="bg-sidebar border-border box-border w-50 p-2" orientation="vertical" value={currentFile.path} onValueChange={path => setCurrentFile(workspace.getFile(path) ?? entryFile)}>
          <TabsList className="bg-sidebar h-fit w-full flex-col items-start gap-2 p-0">
            <TabsTrigger value={entryFile.path} className="w-full justify-start">
              <Braces />
              <span className="truncate">{entryFile.name}</span>
            </TabsTrigger>
            {depFiles.length > 0 ? (
              <Collapsible defaultOpen={currentFile.path !== entryFile.path} className="group/collapsible w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="hover:bg-sidebar-accent text-foreground h-7.5 w-full justify-between border border-transparent px-2! py-1">
                    <div className="flex items-center gap-x-2">
                      <Codepen />
                      dependencies
                    </div>
                    <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="max-h-78 space-y-2 overflow-auto py-2 pl-5">
                  {depFiles.map(({ path, name }) => {
                    return (
                      <TabsTrigger value={path} key={path} className="w-full justify-start text-gray-400">
                        <Braces />
                        <span className="truncate">{name}</span>
                      </TabsTrigger>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </TabsList>
        </Tabs>
      ) : null}
      <div {...containerProps} className={cn('w-0 flex-1 divide-y', containerProps?.className)}>
        {useToolbox ? (
          <div className="border-border flex items-center justify-between p-2">
            <div className="[&_svg]:text-code-foreground flex items-center gap-x-2 px-2 [&_svg]:size-4 [&_svg]:opacity-70">
              {getIconForLanguageExtension('typescript')}
              <span className="text-card-foreground">{currentFile.path.replace(/^(\.\.?\/)+/, '')}</span>
            </div>
            <div>
              {(Array.isArray(useToolbox) ? useToolbox : (['reset', 'format', 'toggle-sidebar', 'copy'] as const)).map((t, index) => {
                if (isValidElement(t)) return t;

                let tooltip;
                let icon;
                let onClick;
                let render;

                if (typeof t === 'string') {
                  const item = toolboxItems[t as ToolboxItemId];
                  if (item) {
                    tooltip = item.tooltip;
                    icon = item.icon;
                    onClick = item.onClick;
                  } else {
                    return null;
                  }
                } else {
                  tooltip = (t as ToolboxItemConfig).tooltip;
                  icon = (t as ToolboxItemConfig).icon;
                  onClick = (t as ToolboxItemConfig).onClick;
                  render = (t as ToolboxItemConfig).render;
                }
                const ctx: ToolboxContext = { editor: editorRef.current, workspace, currentFile };

                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      {icon ? (
                        <Button variant="ghost" size="icon-sm" onClick={() => onClick?.(ctx)}>
                          {icon}
                        </Button>
                      ) : render ? (
                        render(ctx)
                      ) : null}
                    </TooltipTrigger>
                    <TooltipContent>{tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ) : null}
        <Monaco
          value={value}
          defaultValue={currentFile.code}
          path={`file:///${workspace.id}/${currentFile.path.replace(/^(\.\.?\/)+/, '')}`}
          theme={AVAILABLE_THEMES[theme] ?? AVAILABLE_THEMES.light}
          dts={dts}
          className={className}
          width={width}
          height={height}
          wrapperProps={wrapperProps}
          options={{
            padding: { top: 12, bottom: 12 },
            lineDecorationsWidth: 12,
            ...options
          }}
          onChange={(value, evt) => {
            onChange?.(value, evt);
            workspace.setFile(currentFile.path, value || '');
          }}
          onMount={editorInstance => (editorRef.current = editorInstance)}
        />
      </div>
    </div>
  );
}
