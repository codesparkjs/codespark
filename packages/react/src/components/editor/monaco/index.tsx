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
  readonly id?: string;
  dts?: Record<string, string>;
  files?: Record<string, string>;
}

const addedLibs = new Set<string>();

export const Monaco = memo(function Monaco(props: MonacoProps) {
  const { value = '', options = {}, defaultLanguage = 'typescript', path = 'file:///index.tsx', theme, onChange, onMount, width, height, id, dts, files, ...rest } = props;
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
    if (!monacoInstance) return;

    Object.entries(libs).forEach(([module, content]) => {
      if (addedLibs.has(module)) return;

      if (module.startsWith('http://') || module.startsWith('https://')) {
        monacoInstance.typescript.typescriptDefaults.addExtraLib(`declare module '${module}' { ${content} }`, module);
      } else {
        monacoInstance.typescript.typescriptDefaults.addExtraLib(content || `declare module '${module}'`, `file:///node_modules/${module}/index.d.ts`);
      }
      addedLibs.add(module);
    });
  };

  const createModels = (files: Record<string, string> = {}) => {
    if (!monacoInstance || !id) return;

    const prefix = `file:///${id}/`;
    const filePaths = new Set(Object.keys(files).map(p => p.replace(/^(\.\.?\/)+/, '')));
    monacoInstance.editor.getModels().forEach(model => {
      const uriStr = model.uri.toString();
      if (uriStr.startsWith(prefix)) {
        const modelPath = uriStr.slice(prefix.length);
        if (!filePaths.has(modelPath)) {
          model.dispose();
        }
      }
    });

    Object.entries(files).forEach(([filePath, code]) => {
      const normalizedPath = filePath.replace(/^(\.\.?\/)+/, '');
      const uri = monacoInstance.Uri.parse(`${prefix}${normalizedPath}`);

      if (!monacoInstance!.editor.getModel(uri)) {
        const ext = filePath.split('.').pop();
        const lang = ['ts', 'tsx'].includes(ext!) ? 'typescript' : ext === 'css' ? 'css' : ext === 'json' ? 'json' : 'javascript';
        monacoInstance.editor.createModel(code, lang, uri);
      }
    });
  };

  const addSuggestions = (paths: string[]) => {
    if (!monacoInstance) return;

    const getRelativePath = (from: string, to: string): string => {
      const fromParts = from.replace(/^\.\//, '').split('/').slice(0, -1);
      const toParts = to.replace(/^\.\//, '').split('/');

      let commonLength = 0;
      while (commonLength < fromParts.length && commonLength < toParts.length - 1 && fromParts[commonLength] === toParts[commonLength]) {
        commonLength++;
      }

      const upCount = fromParts.length - commonLength;
      const relativeParts = upCount > 0 ? Array(upCount).fill('..') : ['.'];
      return relativeParts.concat(toParts.slice(commonLength)).join('/');
    };

    return monacoInstance.languages.registerCompletionItemProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
      triggerCharacters: ['/', "'", '"'],
      provideCompletionItems(model, position) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const importMatch = textUntilPosition.match(/(?:import\s+.*?\s+from\s+|import\s+)(['"])(\.[^'"]*?)$/);
        if (!importMatch) return { suggestions: [] };

        const typedPath = importMatch[2];
        const filePaths = paths.filter(p => !p.endsWith('/'));
        const suggestions: monaco.languages.CompletionItem[] = [];
        const addedPaths = new Set<string>();

        const currentPath = model.uri.path.replace(/^\/[^/]+\//, './');

        for (const filePath of filePaths) {
          if (filePath === currentPath) continue;

          const relativePath = getRelativePath(currentPath, filePath);
          if (!relativePath.startsWith(typedPath)) continue;

          let displayPath = relativePath;
          if (/\.(tsx?|jsx?)$/.test(displayPath)) {
            displayPath = displayPath.replace(/\.(tsx?|jsx?)$/, '');
          }

          if (!addedPaths.has(displayPath)) {
            addedPaths.add(displayPath);
            suggestions.push({
              label: displayPath,
              kind: monacoInstance.languages.CompletionItemKind.File,
              insertText: displayPath.slice(typedPath.length),
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              }
            });
          }
        }

        return { suggestions };
      }
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
    addExtraLib(dts);
  }, [dts, monacoInstance]);

  useEffect(() => {
    createModels(files);
    const provider = addSuggestions(Object.keys(files || {}));

    return () => provider?.dispose();
  }, [files, monacoInstance]);

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
