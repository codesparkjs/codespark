import { Check, Copy, RefreshCw, RemoveFormatting } from 'lucide-react';
import { type ComponentProps, isValidElement, type JSX, type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { type ConfigContextValue, useCodespark, useConfig } from '@/context';
import { type EditorAdapter, EditorEngine } from '@/lib/editor-adapter';
import { cn, generateId, useCopyToClipboard } from '@/lib/utils';
import { useWorkspace, Workspace } from '@/lib/workspace';
import { INTERNAL_INIT_OPFS, INTERNAL_REGISTER_EDITOR, INTERNAL_UNREGISTER_EDITOR } from '@/lib/workspace/internals';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

import { CodeMirror, type CodeMirrorProps, createCodeMirrorAdapter } from './codemirror';
import { getIconForLanguageExtension } from './icons';
import { AVAILABLE_THEME, createMonacoAdapter, Monaco, type MonacoProps } from './monaco';

type ToolboxItemId = 'reset' | 'format' | 'copy';

export interface ToolboxItemConfig {
  tooltip?: string;
  icon?: ReactNode;
  onClick?: (editor: EditorAdapter | null) => void;
  render?: (editor: EditorAdapter | null) => ReactNode;
}

const dtsCacheMap = new Map<string, string>();

export interface CodesparkEditorBaseProps extends Pick<ConfigContextValue, 'theme'> {
  id?: string;
  value?: string;
  workspace?: Workspace;
  toolbox?: boolean | (ToolboxItemId | ToolboxItemConfig | ReactElement)[];
  useOPFS?: boolean;
  containerProps?: ComponentProps<'div'>;
}

export interface CodesparkEditorEngineProps {
  [EditorEngine.Monaco]: Pick<MonacoProps, 'width' | 'height' | 'onChange' | 'onMount' | 'className' | 'wrapperProps' | 'options'>;
  [EditorEngine.CodeMirror]: Pick<CodeMirrorProps, 'width' | 'height' | 'extensions' | 'onChange' | 'onMount' | 'className' | 'basicSetup'>;
}

export type CodesparkEditorProps<E extends EditorEngine = EditorEngine.Monaco> = CodesparkEditorBaseProps & CodesparkEditorEngineProps[E];

function propsTypeGuard(props: CodesparkEditorProps<EditorEngine>, editor: EditorEngine, guardType: EditorEngine.Monaco): props is CodesparkEditorProps<EditorEngine.Monaco>;
function propsTypeGuard(props: CodesparkEditorProps<EditorEngine>, editor: EditorEngine, guardType: EditorEngine.CodeMirror): props is CodesparkEditorProps<EditorEngine.CodeMirror>;
function propsTypeGuard(props: CodesparkEditorProps<EditorEngine>, editor: EditorEngine, guardType: EditorEngine): boolean {
  if ('editor' in props && props.editor === guardType) return true;

  return editor === guardType;
}

export function CodesparkEditor(props: CodesparkEditorProps<EditorEngine.Monaco>): JSX.Element;
export function CodesparkEditor<E extends EditorEngine>(props: CodesparkEditorProps<E> & { editor?: E }): JSX.Element;
export function CodesparkEditor<E extends EditorEngine>(props: CodesparkEditorProps<E> & { editor?: E }) {
  const { theme: globalTheme, editor: globalEditor } = useConfig();
  const { workspace: contextWorkspace, theme: contextTheme } = useCodespark() || {};
  const { id, value = '', workspace = contextWorkspace ?? new Workspace({ entry: './App.tsx', files: { './App.tsx': value } }), theme = contextTheme ?? globalTheme ?? 'light', editor, className, toolbox = true, useOPFS = false, containerProps } = props;
  const { files, currentFile, deps } = useWorkspace(workspace);
  const idRef = useRef(id ?? generateId('editor'));
  const editorRef = useRef<EditorAdapter | null>(null);
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
        editorRef.current?.setValue(initialCode);
        workspace.setFile(path, initialCode);
      }
    },
    format: {
      tooltip: 'Format Document',
      icon: <RemoveFormatting className="size-3.5!" />,
      onClick: () => {
        editorRef.current?.format();
      }
    },
    copy: {
      tooltip: isCopied ? 'Copied' : 'Copy to Clipboard',
      icon: isCopied ? <Check className="size-3.5!" /> : <Copy className="size-3.5!" />,
      onClick: () => {
        const content = editorRef.current?.getValue() || '';
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
    const editorValue = editorRef.current?.getValue();
    if (editorValue && editorValue !== currentFile.code) {
      editorRef.current?.setValue(currentFile.code ?? '');
    }
  }, [currentFile.code]);

  useEffect(() => {
    if (!value) return;

    workspace.setFile(workspace.entry, value);
  }, [value]);

  useEffect(() => {
    if (typeof window === 'undefined' || editor !== EditorEngine.Monaco) return;

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
      .then(results => Object.fromEntries(results))
      .then(setDts);

    return () => {
      controllers.forEach(controller => controller.abort());
    };
  }, [deps.imports, editor]);

  return (
    <div {...containerProps} className={cn('h-full divide-y', containerProps?.className)}>
      {toolbox ? (
        <div className="border-border flex items-center justify-between p-2">
          <div className="[&_svg]:text-code-foreground flex items-center gap-x-2 px-2 [&_svg]:size-4 [&_svg]:opacity-70">
            {getIconForLanguageExtension('typescript')}
            <span className="text-card-foreground">{currentFile.path.replace(/^(\.\.?\/)+/, '')}</span>
          </div>
          {isValidElement(toolbox) ? (
            toolbox
          ) : (
            <div className="flex items-center">
              {(Array.isArray(toolbox) ? toolbox : (['reset', 'format', 'copy'] as const)).map((t, index) => {
                if (isValidElement(t)) return t;

                const item = typeof t === 'string' ? toolboxItems[t as ToolboxItemId] : (t as ToolboxItemConfig);
                if (!item) return null;

                const { tooltip, icon, onClick, render } = item;

                function renderTriggerContent(): ReactNode {
                  if (icon) {
                    return (
                      <Button variant="ghost" size="icon-sm" onClick={() => onClick?.(editorRef.current)}>
                        {icon}
                      </Button>
                    );
                  }
                  if (render) {
                    return render(editorRef.current);
                  }
                  return null;
                }

                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>{renderTriggerContent()}</TooltipTrigger>
                    <TooltipContent>{tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      {propsTypeGuard(props, globalEditor ?? EditorEngine.Monaco, EditorEngine.CodeMirror) ? (
        <CodeMirror
          id={`${workspace.id}-${idRef.current}`}
          className={className}
          value={currentFile.code}
          height={props.height ?? '200px'}
          width={props.width}
          theme={theme}
          basicSetup={props.basicSetup}
          onChange={(value, viewUpdate) => {
            props.onChange?.(value, viewUpdate);

            if (value === currentFile.code) return;
            workspace.setFile(currentFile.path, value || '');
          }}
          onMount={editor => {
            props.onMount?.(editor);

            const adapter = createCodeMirrorAdapter(editor);
            editorRef.current = adapter;
            workspace[INTERNAL_REGISTER_EDITOR](idRef.current, adapter);
          }}
        />
      ) : (
        <Monaco
          id={`${workspace.id}-${idRef.current}`}
          value={value}
          defaultValue={currentFile.code}
          path={`file:///${workspace.id}-${idRef.current}/${currentFile.path.replace(/^(\.\.?\/)+/, '')}`}
          theme={AVAILABLE_THEME[theme] ?? AVAILABLE_THEME.light}
          dts={dts}
          files={files}
          language={language}
          className={className}
          height={props.height ?? 200}
          width={props.width}
          wrapperProps={props.wrapperProps}
          options={{
            padding: { top: 12, bottom: 12 },
            lineDecorationsWidth: 12,
            ...props.options
          }}
          onChange={(value, evt) => {
            props.onChange?.(value, evt);

            if (value === currentFile.code) return;
            workspace.setFile(currentFile.path, value || '');
          }}
          onMount={(editorInstance, monacoInstance) => {
            props.onMount?.(editorInstance, monacoInstance);

            const adapter = createMonacoAdapter(editorInstance);
            editorRef.current = adapter;
            workspace[INTERNAL_REGISTER_EDITOR](idRef.current, adapter);
          }}
        />
      )}
    </div>
  );
}
