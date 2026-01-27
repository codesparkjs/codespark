import { debounce } from 'lodash-es';
import { Check, Copy, RefreshCw, RemoveFormatting } from 'lucide-react';
import { type ComponentProps, isValidElement, type JSX, type ReactElement, type ReactNode, useCallback, useEffect, useId, useMemo, useRef } from 'react';

import { type ConfigContextValue, useCodespark, useConfig } from '@/context';
import { type EditorAdapter, EditorEngine } from '@/lib/editor-adapter';
import { cn, useCopyToClipboard } from '@/lib/utils';
import { useWorkspace, Workspace } from '@/lib/workspace';
import { INTERNAL_INIT_OPFS, INTERNAL_REGISTER_EDITOR, INTERNAL_UNREGISTER_EDITOR } from '@/lib/workspace/internals';
import { Button } from '@/ui/button';
import { getIconForLanguageExtension } from '@/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

import { CodeMirror, type CodeMirrorProps } from './codemirror';
import type { Monaco, MonacoProps } from './monaco';
import { AVAILABLE_THEME } from './monaco/theme';

type ToolboxItemId = 'reset' | 'format' | 'copy';

export interface ToolboxItemConfig {
  tooltip?: string;
  icon?: ReactNode;
  onClick?: (editor: EditorAdapter | null) => void;
  render?: (editor: EditorAdapter | null) => ReactNode;
}

export interface CodesparkEditorBaseProps extends Pick<ConfigContextValue, 'theme'> {
  readonly id?: string;
  value?: string;
  className?: string;
  workspace?: Workspace;
  toolbox?: boolean | (ToolboxItemId | ToolboxItemConfig | ReactElement)[];
  useOPFS?: boolean;
  containerProps?: ComponentProps<'div'>;
}

export interface CodesparkEditorEngineProps {
  [EditorEngine.Monaco]: Pick<MonacoProps, 'width' | 'height' | 'onChange' | 'onMount' | 'wrapperProps' | 'options'>;
  [EditorEngine.CodeMirror]: Pick<CodeMirrorProps, 'width' | 'height' | 'extensions' | 'onChange' | 'onMount' | 'readOnly' | 'fontFamily' | 'basicSetup'>;
}

export type CodesparkEditorEngineComponents = typeof Monaco | typeof CodeMirror;

export type CodesparkEditorProps<E extends EditorEngine = EditorEngine.CodeMirror> = CodesparkEditorBaseProps & CodesparkEditorEngineProps[E];

function propsTypeGuard(props: CodesparkEditorProps<EditorEngine>, editor: CodesparkEditorEngineComponents, kind: EditorEngine.Monaco): props is CodesparkEditorProps<EditorEngine.Monaco>;
function propsTypeGuard(props: CodesparkEditorProps<EditorEngine>, editor: CodesparkEditorEngineComponents, kind: EditorEngine.CodeMirror): props is CodesparkEditorProps<EditorEngine.CodeMirror>;
function propsTypeGuard(props: CodesparkEditorProps<EditorEngine>, editor: CodesparkEditorEngineComponents, kind: EditorEngine): boolean {
  if ('editor' in props && (props.editor as CodesparkEditorEngineComponents)?.kind === kind) return true;

  return editor.kind === kind;
}

export function CodesparkEditor(props: CodesparkEditorProps<EditorEngine.CodeMirror> & { editor?: typeof CodeMirror }): JSX.Element;
export function CodesparkEditor(props: CodesparkEditorProps<EditorEngine.Monaco> & { editor: typeof Monaco }): JSX.Element;
export function CodesparkEditor<E extends EditorEngine = never>(props: CodesparkEditorProps<E>): JSX.Element;
export function CodesparkEditor(props: CodesparkEditorProps<EditorEngine> & { editor?: CodesparkEditorEngineComponents }) {
  const { theme: globalTheme, editor: globalEditor, fontFamily: globalFontFamily } = useConfig();
  const { workspace: contextWorkspace, theme: contextTheme } = useCodespark() || {};
  const {
    id,
    value = '',
    workspace = contextWorkspace ?? new Workspace({ entry: './App.tsx', files: { './App.tsx': value } }),
    theme = contextTheme ?? globalTheme ?? 'light',
    editor = globalEditor ?? CodeMirror,
    className,
    toolbox = true,
    useOPFS = false,
    containerProps
  } = props;
  const { files, currentFile, deps } = useWorkspace(workspace);
  const uid = useId();
  const editorId = id ?? `editor${uid}`;
  const editorRef = useRef<EditorAdapter | null>(null);
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const language = useMemo(() => {
    const ext = currentFile.name?.split('.').pop()?.toLowerCase();
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

  const handleEditorMount = (adapter: EditorAdapter) => {
    editorRef.current = adapter;
    workspace[INTERNAL_REGISTER_EDITOR](editorId, adapter);
  };

  const handleEditorChange = useCallback(
    debounce(
      (newValue?: string) => {
        if (newValue === currentFile.code) return;

        workspace.setFile(currentFile.path, newValue || '');
      },
      500,
      { leading: true, trailing: true }
    ),
    []
  );

  const renderEditor = () => {
    const id = `${workspace.id}${editorId}`;

    if (editor.kind === EditorEngine.Monaco && propsTypeGuard(props, editor, EditorEngine.Monaco)) {
      const { height, width, wrapperProps, options, onChange, onMount } = props;
      const { fontFamily = globalFontFamily } = options || {};

      return (
        <editor.Component
          id={id}
          value={value}
          defaultValue={currentFile.code}
          path={`file:///${id}/${currentFile.path.replace(/^(\.\.?\/)+/, '')}`}
          theme={AVAILABLE_THEME[theme] ?? AVAILABLE_THEME.light}
          files={files}
          imports={deps.imports}
          className={className}
          height={height ?? 200}
          width={width}
          wrapperProps={wrapperProps}
          language={language}
          options={{
            padding: { top: 12, bottom: 12 },
            lineDecorationsWidth: 12,
            ...options,
            fontFamily
          }}
          onChange={(newValue, evt) => {
            onChange?.(newValue, evt);
            handleEditorChange(newValue);
          }}
          onMount={(editorInstance, monacoInstance) => {
            onMount?.(editorInstance, monacoInstance);
            handleEditorMount(editor.createAdapter(editorInstance));
          }}
        />
      );
    }

    if (editor.kind === EditorEngine.CodeMirror && propsTypeGuard(props, editor, EditorEngine.CodeMirror)) {
      const { height, width, basicSetup, fontFamily, onChange, onMount } = props;

      return (
        <editor.Component
          id={id}
          className={className}
          value={currentFile.code}
          height={height ?? '200px'}
          width={width}
          theme={theme}
          basicSetup={basicSetup}
          fontFamily={fontFamily ?? globalFontFamily}
          lang={language}
          onChange={(newValue, viewUpdate) => {
            onChange?.(newValue, viewUpdate);
            handleEditorChange(newValue);
          }}
          onMount={editorInstance => {
            onMount?.(editorInstance);
            handleEditorMount(editor.createAdapter(editorInstance));
          }}
        />
      );
    }

    return null;
  };

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
    if (useOPFS) {
      workspace[INTERNAL_INIT_OPFS]();
    }

    return () => {
      workspace[INTERNAL_UNREGISTER_EDITOR](editorId);
    };
  }, []);

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
      {renderEditor()}
    </div>
  );
}
