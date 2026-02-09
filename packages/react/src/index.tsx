import { registerFramework } from '@codespark/framework';
import { react } from '@codespark/framework/react';
import { Maximize } from 'lucide-react';
import { type RefObject, useEffect, useState } from 'react';

import { CodesparkEditor, type CodesparkEditorEngineComponents, type CodesparkEditorProps } from '@/components/editor';
import { CodesparkFileExplorer } from '@/components/file-explorer';
import { CodesparkPreview, type CodesparkPreviewProps } from '@/components/preview';
import { type CodesparkContextValue, CodesparkProvider, type ConfigContextValue } from '@/context';
import { EditorEngine } from '@/lib/editor-adapter';
import { cn } from '@/lib/utils';
import { useWorkspace, type Workspace } from '@/lib/workspace';

export * from '@/components/editor';
export * from '@/components/file-explorer';
export { Link, type LinkProps, Script, type ScriptProps, Style, type StyleProps } from '@/components/inject';
export * from '@/components/preview';
export { CodesparkProvider, type CodesparkProviderProps, ConfigProvider, type ConfigProviderProps } from '@/context';
export * from '@/lib/editor-adapter';
export * from '@/lib/workspace';

registerFramework(react);

export interface CodesparkProps extends Pick<ConfigContextValue, 'theme'>, Pick<CodesparkContextValue, 'framework' | 'imports'>, Pick<CodesparkEditorProps, 'toolbox'>, Pick<CodesparkPreviewProps, 'tailwindcss' | 'onConsole' | 'onError' | 'children'> {
  /**
   * Source code content for single-file mode
   *
   * @example
   * ```tsx
   * <Codespark code="export default () => <div>Hello</div>" />
   * ```
   */
  code?: string;
  /**
   * File mapping for multi-file mode, where keys are file paths and values are file contents
   *
   * @example
   * ```tsx
   * <Codespark files={{ './App.tsx': 'export default () => <div>Hello</div>', './utils.ts': 'export const foo = 1' }} />
   * ```
   */
  files?: Record<string, string>;
  /**
   * Entry file path
   *
   * @default './App.tsx'
   */
  name?: string;
  /**
   * CSS class name for the container
   */
  className?: string;
  /**
   * Whether to show the code editor
   *
   * @default true
   */
  showEditor?: boolean;
  /**
   * Whether to show the preview area
   *
   * @default true
   */
  showPreview?: boolean;
  /**
   * Whether to show the file explorer
   *
   * @default true
   */
  showFileExplorer?: boolean;
  /**
   * Whether to set the editor to read-only mode
   *
   * @default false
   */
  readonly?: boolean;
  /**
   * Whether the file explorer is expanded by default. When not set, it is automatically determined based on the number of files
   */
  defaultExpanded?: boolean;
  /**
   * Ref to get the Workspace instance for external control
   *
   * @example
   * ```tsx
   * const workspaceRef = useRef<Workspace | null>(null);
   * <Codespark getWorkspace={workspaceRef} />
   * ```
   */
  getWorkspace?: RefObject<Workspace | null>;
  /**
   * Editor engine component, supports Monaco or CodeMirror
   *
   * @default CodeMirror
   */
  editor?: CodesparkEditorEngineComponents;
  /**
   * Editor height. Accepts a number (pixels) or CSS string (e.g., '200px', '50%')
   *
   * @default 200
   */
  editorHeight?: string | number;
  /**
   * Preview area height. Accepts a number (pixels) or CSS string (e.g., '200px', '50%')
   *
   * @default 200
   */
  previewHeight?: string | number;
  /**
   * Layout orientation of the editor and preview areas.
   * - `vertical`: Preview on top, editor on bottom
   * - `horizontal`: Editor on left (2/3 width), preview on right (1/3 width)
   *
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Whether to apply preflight styles (base reset, font smoothing, layout defaults) in the preview iframe
   *
   * @default true
   */
  preflight?: boolean;
}

/**
 * Codespark - A browser-based React code playground with live preview.
 *
 * This component integrates a code editor, file explorer, and preview area
 * to provide a complete interactive code demonstration experience.
 * Supports both single-file mode (via `code` prop) and multi-file mode (via `files` prop).
 */
export function Codespark(props: CodesparkProps) {
  const {
    code,
    files,
    name = './App.tsx',
    theme,
    editor,
    framework = 'react',
    showEditor = true,
    showPreview = true,
    showFileExplorer = true,
    readonly: readOnly,
    className,
    toolbox,
    tailwindcss,
    onConsole,
    onError,
    children,
    defaultExpanded,
    getWorkspace,
    editorHeight,
    previewHeight,
    orientation = 'vertical',
    preflight
  } = props;
  const { workspace, fileTree, compileError } = useWorkspace({ entry: name, files: files ?? { [name]: code || '' }, framework });
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded ?? fileTree.length > 1);

  const renderEditor = () => {
    const sharedProps = {
      containerProps: { className: 'w-0 flex-1' },
      toolbox: toolbox ?? [
        'reset',
        'format',
        {
          tooltip: 'Toggle File Explorer',
          icon: <Maximize className="size-3.5!" />,
          onClick: () => setExpanded(v => !v)
        },
        'copy'
      ],
      onChange: () => {
        setRuntimeError(null);
      }
    };

    if (editor?.kind === EditorEngine.Monaco) {
      return <CodesparkEditor editor={editor} {...sharedProps} height={editorHeight} options={{ readOnly }} />;
    }

    const height = editorHeight ? (typeof editorHeight === 'string' ? editorHeight : `${editorHeight}px`) : void 0;
    return <CodesparkEditor editor={editor} {...sharedProps} height={height} readOnly={readOnly} />;
  };

  useEffect(() => {
    setRuntimeError(compileError);
  }, [compileError]);

  useEffect(() => {
    if (getWorkspace) {
      getWorkspace.current = workspace;
    }
  }, []);

  return (
    <CodesparkProvider workspace={workspace} theme={theme}>
      <div className={cn('border-border relative grid w-full overflow-hidden rounded-lg border', orientation === 'horizontal' && 'grid-cols-[2fr_1fr]', className)}>
        <div className={cn('border-border relative', showPreview && showEditor ? (orientation === 'vertical' ? 'border-b' : 'border-l') : '', orientation === 'horizontal' && 'order-2')}>
          {showPreview ? (
            <CodesparkPreview
              tailwindcss={tailwindcss}
              onConsole={onConsole}
              onError={error => {
                onError?.(error);
                setRuntimeError(error as Error);
              }}
              height={previewHeight}
              preflight={preflight}>
              {children}
            </CodesparkPreview>
          ) : null}
          {runtimeError ? (
            <div className="bg-background absolute inset-0 z-20 overflow-auto p-6">
              <div className="text-2xl text-red-500">{runtimeError.name}</div>
              <div className="mt-3 font-mono">{runtimeError.stack || runtimeError.message}</div>
            </div>
          ) : null}
        </div>
        {showEditor ? (
          <div className={cn('flex h-full w-full divide-x', orientation === 'horizontal' && 'order-1')}>
            {expanded && showFileExplorer ? <CodesparkFileExplorer /> : null}
            {renderEditor()}
          </div>
        ) : null}
      </div>
    </CodesparkProvider>
  );
}

export const useMDXComponents = () => {
  return { Codespark, CodesparkEditor, CodesparkPreview };
};
