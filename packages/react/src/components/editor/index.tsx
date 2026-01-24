import { Check, Copy, RefreshCw, RemoveFormatting } from 'lucide-react';
import type * as monaco from 'monaco-editor';
import { type ComponentProps, isValidElement, type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { type ConfigContextValue, useCodespark, useConfig } from '@/context';
import { cn, generateId, useCopyToClipboard } from '@/lib/utils';
import { useWorkspace, Workspace } from '@/lib/workspace';
import { INTERNAL_INIT_OPFS, INTERNAL_REGISTER_EDITOR, INTERNAL_UNREGISTER_EDITOR } from '@/lib/workspace/internals';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

import { getIconForLanguageExtension } from './icons';
import { AVAILABLE_THEMES, Monaco, type MonacoProps } from './monaco';

type ToolboxItemId = 'reset' | 'format' | 'copy';

export interface ToolboxItemConfig {
  tooltip?: string;
  icon?: ReactNode;
  onClick?: (editor: monaco.editor.IStandaloneCodeEditor | null) => void;
  render?: (editor: monaco.editor.IStandaloneCodeEditor | null) => ReactNode;
}

const dtsCacheMap = new Map<string, string>();

export interface CodesparkEditorProps extends Pick<ConfigContextValue, 'theme'>, Pick<MonacoProps, 'options' | 'width' | 'height' | 'onChange' | 'onMount' | 'className'> {
  id?: string;
  value?: string;
  workspace?: Workspace;
  toolbox?: boolean | (ToolboxItemId | ToolboxItemConfig | ReactElement)[] | ((editor: monaco.editor.IStandaloneCodeEditor | null) => ReactNode) | ReactNode;
  useOPFS?: boolean;
  wrapperProps?: ComponentProps<'section'>;
  containerProps?: ComponentProps<'div'>;
}

export function CodesparkEditor(props: CodesparkEditorProps) {
  const { theme: globalTheme } = useConfig();
  const { workspace: contextWorkspace, theme: contextTheme } = useCodespark() || {};
  const {
    id,
    value = '',
    workspace = contextWorkspace ?? new Workspace({ entry: './App.tsx', files: { './App.tsx': value } }),
    theme = contextTheme ?? globalTheme ?? 'light',
    options,
    width,
    height = 200,
    className,
    toolbox = true,
    useOPFS = false,
    wrapperProps,
    containerProps,
    onChange,
    onMount
  } = props;
  const idRef = useRef(id ?? generateId('editor'));
  const { files, currentFile, deps } = useWorkspace(workspace);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const [dts, setDts] = useState<Record<string, string>>(() => {
    const internalDts = Object.fromEntries(deps.internal.map(({ alias, dts }) => [alias, dts]));
    const externalDts = Object.fromEntries(deps.external.map(({ name }) => [name, '']));

    return { ...internalDts, ...externalDts };
  });
  const language = useMemo(() => {
    const ext = currentFile.name.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', css: 'css', json: 'json', html: 'html', md: 'markdown' };
    return ext ? langMap[ext] : undefined;
  }, [currentFile.name]);
  const toolboxItems: Record<ToolboxItemId, ToolboxItemConfig> = {
    reset: {
      tooltip: 'Reset Document',
      icon: <RefreshCw className="size-3.5!" />,
      onClick: () => {
        const { path } = currentFile;
        const initialCode = workspace.initialFiles[path] ?? '';
        editorRef.current?.getModel()?.setValue(initialCode);
        workspace.setFile(path, initialCode);
      }
    },
    format: {
      tooltip: 'Format Document',
      icon: <RemoveFormatting className="size-3.5!" />,
      onClick: () => {
        editorRef.current?.getAction('editor.action.formatDocument')?.run();
      }
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
    if (useOPFS) {
      workspace[INTERNAL_INIT_OPFS]();
    }

    return () => {
      workspace[INTERNAL_UNREGISTER_EDITOR](idRef.current);
    };
  }, []);

  useEffect(() => {
    const editorValue = editorRef.current?.getModel()?.getValue();
    if (editorValue && editorValue !== currentFile.code) {
      editorRef.current?.getModel()?.setValue(currentFile.code ?? '');
    }
  }, [currentFile.code]);

  useEffect(() => {
    if (!value) return;

    workspace.setFile(workspace.entry, value);
  }, [value]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const controllers = new Map<string, AbortController>();
    Promise.all(
      Object.entries(deps.imports).map(async ([name, url]) => {
        if (dtsCacheMap.has(name)) return [name, dtsCacheMap.get(name)!];

        const controller = new AbortController();
        controllers.set(name, controller);

        try {
          const { headers } = await fetch(url, { method: 'HEAD', signal: controller.signal });
          const dtsUrl = headers.get('X-TypeScript-Types');
          if (dtsUrl) {
            const dtsContent = await fetch(dtsUrl, { signal: controller.signal }).then(r => r.text());
            dtsCacheMap.set(name, dtsContent);

            return [name, dtsContent];
          }

          return [name, ''];
        } catch {
          return [name, ''];
        }
      })
    )
      .then(results => Object.fromEntries(results.filter(result => result.length > 0)))
      .then(setDts);

    return () => {
      controllers.forEach(controller => controller.abort());
    };
  }, [deps.imports]);

  return (
    <div {...containerProps} className={cn('h-full divide-y', containerProps?.className)}>
      {toolbox ? (
        <div className="border-border flex items-center justify-between p-2">
          <div className="[&_svg]:text-code-foreground flex items-center gap-x-2 px-2 [&_svg]:size-4 [&_svg]:opacity-70">
            {getIconForLanguageExtension('typescript')}
            <span className="text-card-foreground">{currentFile.path.replace(/^(\.\.?\/)+/, '')}</span>
          </div>
          {typeof toolbox === 'function' ? (
            toolbox(editorRef.current)
          ) : isValidElement(toolbox) ? (
            toolbox
          ) : (
            <div className="flex items-center">
              {(Array.isArray(toolbox) ? toolbox : (['reset', 'format', 'toggle-sidebar', 'copy'] as const)).map((t, index) => {
                if (isValidElement(t)) return t;

                const item = typeof t === 'string' ? toolboxItems[t as ToolboxItemId] : (t as ToolboxItemConfig);
                if (!item) return null;

                const { tooltip, icon, onClick, render } = item;

                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      {icon ? (
                        <Button variant="ghost" size="icon-sm" onClick={() => onClick?.(editorRef.current)}>
                          {icon}
                        </Button>
                      ) : render ? (
                        render(editorRef.current)
                      ) : null}
                    </TooltipTrigger>
                    <TooltipContent>{tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      <Monaco
        id={`${workspace.id}-${idRef.current}`}
        value={value}
        defaultValue={currentFile.code}
        path={`file:///${workspace.id}-${idRef.current}/${currentFile.path.replace(/^(\.\.?\/)+/, '')}`}
        theme={AVAILABLE_THEMES[theme] ?? AVAILABLE_THEMES.light}
        dts={dts}
        files={files}
        language={language}
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

          if (value === currentFile.code) return;
          workspace.setFile(currentFile.path, value || '');
        }}
        onMount={(editorInstance, monacoInstance) => {
          onMount?.(editorInstance, monacoInstance);
          editorRef.current = editorInstance;
          workspace[INTERNAL_REGISTER_EDITOR](idRef.current, editorInstance);
        }}
      />
    </div>
  );
}
