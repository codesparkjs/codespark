import { registerFramework } from '@codespark/framework';
import { react } from '@codespark/framework/react';
import { Maximize } from 'lucide-react';
import { type JSX, useEffect, useState } from 'react';

import { CodesparkEditor, type CodesparkEditorEngineComponents, type CodesparkEditorProps } from '@/components/editor';
import { CodesparkFileExplorer } from '@/components/file-explorer';
import { CodesparkPreview, type CodesparkPreviewProps } from '@/components/preview';
import { type CodesparkContextValue, CodesparkProvider, type ConfigContextValue } from '@/context';
import type { EditorEngine } from '@/lib/editor-adapter';
import { cn } from '@/lib/utils';
import { useWorkspace, type Workspace } from '@/lib/workspace';

export * from '@/components/editor';
export * from '@/components/file-explorer';
export { Script, type ScriptProps, Style, type StyleProps } from '@/components/inject';
export * from '@/components/preview';
export { CodesparkProvider, type CodesparkProviderProps, ConfigProvider, type ConfigProviderProps } from '@/context';
export * from '@/lib/editor-adapter';
export * from '@/lib/workspace';

registerFramework(react);

export interface CodesparkProps<E extends EditorEngine = EditorEngine.Monaco>
  extends Pick<ConfigContextValue, 'theme'>, Pick<CodesparkContextValue, 'framework'>, Pick<CodesparkEditorProps<E>, 'toolbox'>, Pick<CodesparkPreviewProps, 'tailwindcss' | 'onConsole' | 'onError' | 'children'> {
  code?: string;
  files?: Record<string, string>;
  name?: string;
  className?: string;
  showEditor?: boolean;
  showPreview?: boolean;
  readonly?: boolean;
  defaultExpanded?: boolean;
  getWorkspace?: (ws: Workspace) => void;
}

export function Codespark(props: CodesparkProps<EditorEngine.Monaco>): JSX.Element;
export function Codespark<E extends EditorEngine>(props: CodesparkProps<E> & { editor?: CodesparkEditorEngineComponents[E] }): JSX.Element;
export function Codespark(props: CodesparkProps & { editor?: CodesparkEditorEngineComponents[EditorEngine] }) {
  const { code, files, name = './App.tsx', theme, editor, framework = 'react', showEditor = true, showPreview = true, readonly: readOnly, className, toolbox, tailwindcss, onConsole, onError, children, defaultExpanded, getWorkspace } = props;
  const { workspace, fileTree, compileError } = useWorkspace({ entry: name, files: files ?? { [name]: code || '' }, framework });
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded ?? fileTree.length > 1);

  useEffect(() => {
    setRuntimeError(compileError);
  }, [compileError]);

  useEffect(() => {
    getWorkspace?.(workspace);
  }, []);

  return (
    <CodesparkProvider workspace={workspace} theme={theme}>
      <div className={cn('border-border relative overflow-hidden rounded-lg border', showPreview && showEditor ? 'divide-y' : '', className)}>
        <div className="border-border relative">
          {showPreview ? (
            <CodesparkPreview
              tailwindcss={tailwindcss}
              onConsole={onConsole}
              onError={error => {
                onError?.(error);
                setRuntimeError(error as Error);
              }}>
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
          <div className="flex h-full w-full divide-x">
            {expanded ? <CodesparkFileExplorer /> : null}
            <CodesparkEditor
              editor={editor}
              containerProps={{ className: 'w-0 flex-1' }}
              options={{ readOnly }}
              toolbox={
                toolbox ?? [
                  'reset',
                  'format',
                  {
                    tooltip: 'Toggle File Explorer',
                    icon: <Maximize className="size-3.5!" />,
                    onClick: () => setExpanded(v => !v)
                  },
                  'copy'
                ]
              }
              onChange={() => {
                setRuntimeError(null);
              }}
            />
          </div>
        ) : null}
      </div>
    </CodesparkProvider>
  );
}

export const useMDXComponents = () => {
  return { Codespark };
};
