import { debounce } from 'lodash-es';
import { Check, Copy, RefreshCw, RemoveFormatting } from 'lucide-react';
import { type ComponentProps, isValidElement, type JSX, type ReactElement, type ReactNode, useCallback, useEffect, useId, useRef } from 'react';

import { type ConfigContextValue, useCodespark, useConfig } from '@/context';
import { type EditorAdapter, EditorEngine } from '@/lib/editor-adapter';
import { cn, useCopyToClipboard, useLatest } from '@/lib/utils';
import { useWorkspace, Workspace } from '@/lib/workspace';
import { INTERNAL_REGISTER_EDITOR, INTERNAL_UNREGISTER_EDITOR } from '@/lib/workspace/internals';
import { Button } from '@/ui/button';
import { getIconForLanguageExtension } from '@/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

import { CodeMirror, type CodeMirrorProps } from './codemirror';
import type { Monaco, MonacoProps } from './monaco';

type ToolboxItemId = 'reset' | 'format' | 'copy';

export interface ToolboxItemConfig {
  tooltip?: string;
  icon?: ReactNode;
  asChild?: boolean;
  onClick?: (editor: EditorAdapter | null) => void;
  render?: (editor: EditorAdapter | null) => ReactNode;
}

export interface CodesparkEditorBaseProps extends Pick<ConfigContextValue, 'theme'> {
  /**
   * Unique identifier for the editor instance
   */
  readonly id?: string;
  /**
   * Initial code content for the editor
   */
  value?: string;
  /**
   * CSS class name for the editor element
   */
  className?: string;
  /**
   * Workspace instance to use for file management and compilation
   */
  workspace?: Workspace;
  /**
   * Toolbar configuration. Set to false to hide, true to show default tools, or pass a custom array of tool items
   *
   * @default ['reset', 'format', 'copy']
   */
  toolbox?: boolean | (ToolboxItemId | ToolboxItemConfig | ReactElement)[];
  /**
   * Props to pass to the container div element
   */
  containerProps?: ComponentProps<'div'>;
  /**
   * Debounce wait time in milliseconds for triggering workspace updates on code changes
   *
   * @default 500
   */
  debounceWait?: number;
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

/**
 * CodesparkEditor - A flexible code editor component supporting multiple editor engines.
 *
 * Supports both Monaco Editor and CodeMirror as the underlying editor engine.
 * Integrates with Workspace for file management and automatic compilation.
 * Includes a customizable toolbar with reset, format, and copy functionality.
 */
export function CodesparkEditor(props: CodesparkEditorProps<EditorEngine.CodeMirror> & { editor?: typeof CodeMirror }): JSX.Element;
export function CodesparkEditor(props: CodesparkEditorProps<EditorEngine.Monaco> & { editor: typeof Monaco }): JSX.Element;
export function CodesparkEditor<E extends EditorEngine = never>(props: CodesparkEditorProps<E>): JSX.Element;
export function CodesparkEditor(props: CodesparkEditorProps<EditorEngine> & { editor?: CodesparkEditorEngineComponents }) {
  const { theme: globalTheme, editor: globalEditor, fontFamily: globalFontFamily } = useConfig();
  const { workspace: contextWorkspace, theme: contextTheme } = useCodespark() || {};
  const { id, value = '', theme = contextTheme ?? globalTheme ?? 'light', editor = globalEditor ?? CodeMirror, className, toolbox = true, containerProps, debounceWait = 500 } = props;
  const { files, currentFile, vendor, workspace } = useWorkspace(props.workspace ?? contextWorkspace ?? new Workspace({ entry: './App.tsx', files: { './App.tsx': value } }));
  const uid = useId();
  const editorId = id ?? `editor${uid}`;
  const editorRef = useRef<EditorAdapter | null>(null);
  const currentFileRef = useLatest(currentFile);
  const { copyToClipboard, isCopied } = useCopyToClipboard();
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

  const handleEditorChange = useCallback(
    debounce(
      (newValue?: string) => {
        const { code, path } = currentFileRef.current;
        if (newValue === code) return;

        workspace.setFile(path, newValue || '');
      },
      debounceWait,
      { leading: true, trailing: true }
    ),
    [debounceWait]
  );

  const handleEditorMount = useCallback((adapter: EditorAdapter) => {
    editorRef.current = adapter;
    workspace[INTERNAL_REGISTER_EDITOR](editorId, adapter);
  }, []);

  const renderEditor = () => {
    const id = `${workspace.id}${editorId}`;

    if (editor.kind === EditorEngine.Monaco && propsTypeGuard(props, editor, EditorEngine.Monaco)) {
      const { height, width, wrapperProps, options, onChange, onMount } = props;
      const { fontFamily = globalFontFamily } = options || {};

      return (
        <editor.Component
          id={id}
          value={value || currentFile.code}
          path={`file:///${id}/${currentFile.path.replace(/^(\.\.?\/)+/, '')}`}
          theme={theme === 'light' ? 'vitesse-light' : 'vitesse-dark'}
          files={files}
          imports={vendor.imports}
          className={className}
          height={height ?? 200}
          width={width}
          wrapperProps={wrapperProps}
          language={currentFile.language}
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
      const { height, width, basicSetup, fontFamily, readOnly, onChange, onMount } = props;

      return (
        <editor.Component
          id={id}
          className={className}
          value={value || currentFile.code}
          height={height ?? '200px'}
          width={width}
          theme={theme}
          basicSetup={basicSetup}
          readOnly={readOnly}
          fontFamily={fontFamily ?? globalFontFamily}
          lang={currentFile.language}
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

                const { tooltip, icon, asChild = true, onClick, render } = item;

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
                    <TooltipTrigger asChild={asChild}>{renderTriggerContent()}</TooltipTrigger>
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
