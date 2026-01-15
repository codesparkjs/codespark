'use client';

import type { EditorProps as MonacoEditorProps, OnChange, OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { memo, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/ui/skeleton';

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

const addedLibs = new Set<string>();

export const Monaco = memo(function Monaco(props: MonacoProps) {
  const { value = '', options = {}, defaultLanguage = 'typescript', path = 'file:///index.tsx', theme, onChange, onMount, width, height, dts, ...rest } = props;
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const [monacoInstance, setMonacoInstance] = useState<typeof monaco | null>(null);
  const [MonacoEditor, setMonacoEditor] = useState<typeof import('@monaco-editor/react').default | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    onMount?.(editor, monaco);
    editorInstance.current = editor;
    setMonacoInstance(monaco);
  };

  const handleEditorContentChange: OnChange = (value, evt) => {
    onChange?.(value, evt);
  };

  const addExtraLib = (libs: Record<string, string> = {}) => {
    Object.entries(libs).forEach(([module, content]) => {
      if (addedLibs.has(module)) return;

      if (module.startsWith('http://') || module.startsWith('https://')) {
        monacoInstance!.typescript.typescriptDefaults.addExtraLib(`declare module '${module}' { ${content} }`, module);
      } else {
        monacoInstance!.typescript.typescriptDefaults.addExtraLib(content || `declare module '${module}'`, `file:///node_modules/@types/${module}/index.d.ts`);
      }
      addedLibs.add(module);
    });
  };

  useEffect(() => {
    (async () => {
      await setup();
      setTimeout(() => {
        import('@monaco-editor/react').then(mod => setMonacoEditor(() => mod.default));
      }, 0);
    })();
  }, []);

  useEffect(() => {
    if (!monacoInstance) return;

    addExtraLib(dts);
  }, [dts, monacoInstance]);

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
