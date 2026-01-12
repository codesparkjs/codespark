'use client';

import type { EditorProps as MonacoEditorProps, OnChange, OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { memo, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { setup } from './setup';

export * from './themes';

const MONACO_DEFAULT_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  lineHeight: 24,
  padding: { top: 16, bottom: 16 },
  automaticLayout: true,
  folding: false,
  scrollBeyondLastLine: false,
  minimap: {
    enabled: false
  },
  scrollbar: {
    useShadows: false,
    vertical: 'auto',
    horizontal: 'auto',
    verticalScrollbarSize: 0,
    horizontalScrollbarSize: 0,
    verticalSliderSize: 0,
    horizontalSliderSize: 0
  },
  guides: { indentation: false },
  cursorStyle: 'line-thin',
  overviewRulerBorder: false,
  contextmenu: false,
  renderLineHighlightOnlyWhenFocus: true,
  formatOnPaste: true,
  formatOnType: true,
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false,
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  parameterHints: { enabled: true }
};

export interface MonacoProps extends MonacoEditorProps {
  dts?: Record<string, string>;
}

export const Monaco = memo(function Monaco(props: MonacoProps) {
  const { value = '', options = {}, defaultLanguage = 'typescript', path = 'file:///index.tsx', theme, onChange, onMount, width, height, dts, ...rest } = props;
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor>(void 0);
  const [MonacoEditor, setMonacoEditor] = useState<typeof import('@monaco-editor/react').default | null>(null);
  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    onMount?.(editor, monacoInstance);
    editorInstance.current = editor;

    // Add custom types after editor mounts
    Object.entries(dts || {}).forEach(([module, dts]) => {
      const libContent = dts ? `declare module '${module}' {${dts}};` : `declare module '${module}';`;
      monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(libContent, `ts:${module}`);
    });
  };

  const handleEditorContentChange: OnChange = (value, evt) => {
    onChange?.(value, evt);
  };

  useEffect(() => {
    (async () => {
      await setup();
      setTimeout(() => {
        import('@monaco-editor/react').then(mod => setMonacoEditor(() => mod.default));
      }, 0);
    })();
  }, []);

  if (!MonacoEditor) {
    return (
      <div className="flex flex-col space-y-3 p-5" style={{ height }}>
        <Skeleton className="w-full flex-1 rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-[65%]" />
        </div>
      </div>
    );
  }

  return (
    <MonacoEditor
      value={value}
      options={{ ...MONACO_DEFAULT_OPTIONS, ...options }}
      defaultLanguage={defaultLanguage}
      path={path}
      theme={theme}
      width={width ?? '100%'}
      height={height}
      {...rest}
      onMount={handleEditorDidMount}
      onChange={handleEditorContentChange}
    />
  );
});
