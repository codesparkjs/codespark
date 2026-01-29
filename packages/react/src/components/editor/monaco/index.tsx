import type { EditorProps as MonacoEditorProps, OnChange, OnMount } from '@monaco-editor/react';
import { shikiToMonaco } from '@shikijs/monaco';
import type * as monaco from 'monaco-editor';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import prettier from 'prettier/standalone';
import { memo, useEffect, useRef, useState } from 'react';
import { createHighlighter } from 'shiki';

import { EditorEngine, EditorEngineComponent } from '@/lib/editor-adapter';
import { Skeleton } from '@/ui/skeleton';

import { MonacoEditorAdapter } from './adapter';
import { AVAILABLE_THEME } from './theme';

let initialized = false;

const setup = async () => {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const [mod, highlighter] = await Promise.all([
    import('@monaco-editor/react'),
    createHighlighter({
      themes: [AVAILABLE_THEME.light, AVAILABLE_THEME.dark],
      langs: ['typescript', 'tsx', 'javascript', 'jsx', 'json', 'css', 'html'],
      langAlias: { typescript: 'tsx', javascript: 'jsx' }
    })
  ]);

  window.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === 'json') {
        return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url), { type: 'module' });
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url), { type: 'module' });
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new Worker(new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url), { type: 'module' });
      }
      if (label === 'typescript' || label === 'javascript') {
        return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url), { type: 'module' });
      }
      return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), { type: 'module' });
    }
  };

  return mod.loader
    .init()
    .then((Monaco: typeof monaco) => {
      Monaco.languages.register({ id: 'tsx' });
      Monaco.languages.register({ id: 'jsx' });
      shikiToMonaco(highlighter, Monaco);

      Monaco.typescript.typescriptDefaults.setEagerModelSync(true);

      Monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      });

      Monaco.typescript.typescriptDefaults.setCompilerOptions({
        strict: true,
        noImplicitAny: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        allowUnreachableCode: true,
        allowUnusedLabels: true,
        allowImportingTsExtensions: true,
        target: Monaco.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: Monaco.typescript.ModuleResolutionKind.NodeJs,
        module: Monaco.typescript.ModuleKind.ESNext,
        noEmit: true,
        jsx: Monaco.typescript.JsxEmit.Preserve,
        esModuleInterop: true
      });

      Monaco.languages.registerDocumentFormattingEditProvider('typescript', {
        async provideDocumentFormattingEdits(model, options) {
          const text = model.getValue();
          const formatted = await prettier.format(text, {
            parser: 'typescript',
            plugins: [parserTypescript, parserEstree],
            tabWidth: options.tabSize,
            useTabs: !options.insertSpaces
          });

          return [{ range: model.getFullModelRange(), text: formatted }];
        }
      });
    })
    .then(() => mod.default);
};

const MONACO_DEFAULT_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  fontFamily: 'Fira Code',
  lineHeight: 24,
  padding: { top: 16, bottom: 16 },
  automaticLayout: true,
  folding: false,
  scrollBeyondLastLine: false,
  find: {
    addExtraSpaceOnTop: false
  },
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
  files?: Record<string, string>;
  imports?: Record<string, string>;
}

const addedLibs = new Set<string>();

const dtsCacheMap = new Map<string, string>();

export const Monaco: EditorEngineComponent<EditorEngine.Monaco, MonacoProps, monaco.editor.IStandaloneCodeEditor> = {
  kind: EditorEngine.Monaco,
  Component: memo(function Monaco(props) {
    const { value = '', options = {}, onChange, onMount, width, height, id, language, files, imports, ...rest } = props;
    const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor>(null);
    const [monacoInstance, setMonacoInstance] = useState<typeof monaco | null>(null);
    const [MonacoEditor, setMonacoEditor] = useState<typeof import('@monaco-editor/react').default | null>(null);
    const mergedOptions = { ...MONACO_DEFAULT_OPTIONS, ...Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined)) };

    const handleEditorDidMount: OnMount = (editor, monaco) => {
      onMount?.(editor, monaco);
      editorInstance.current = editor;
      setMonacoInstance(monaco);
    };

    const handleEditorContentChange: OnChange = (value, evt) => {
      onChange?.(value, evt);
    };

    const addExtraLib = (dts: Record<string, string> = {}) => {
      Object.entries(dts).forEach(([module, content]) => {
        if (addedLibs.has(module)) return;

        if (module.startsWith('http://') || module.startsWith('https://')) {
          monacoInstance!.typescript.typescriptDefaults.addExtraLib(`declare module '${module}' { ${content} }`, module);
        } else {
          monacoInstance!.typescript.typescriptDefaults.addExtraLib(content || `declare module '${module}'`, `file:///node_modules/${module}/index.d.ts`);
        }
        addedLibs.add(module);
      });
    };

    const createModels = (files: Record<string, string> = {}) => {
      const prefix = `file:///${id}/`;
      const filePaths = new Set(Object.keys(files).map(p => p.replace(/^(\.\.?\/)+/, '')));
      monacoInstance!.editor.getModels().forEach(model => {
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
        const uri = monacoInstance!.Uri.parse(`${prefix}${normalizedPath}`);

        if (!monacoInstance!.editor.getModel(uri)) {
          const ext = filePath.split('.').pop();
          const lang = ['ts', 'tsx'].includes(ext!) ? 'typescript' : ext === 'css' ? 'css' : ext === 'json' ? 'json' : 'javascript';
          monacoInstance!.editor.createModel(code, lang, uri);
        }
      });
    };

    const addSuggestions = (paths: string[]) => {
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

      return monacoInstance!.languages.registerCompletionItemProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
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
                kind: monacoInstance!.languages.CompletionItemKind.File,
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
        const MonacoEditorReact = await setup();
        if (MonacoEditorReact) {
          setMonacoEditor(() => MonacoEditorReact);
        }
      })();

      return () => {
        initialized = false;
      };
    }, []);

    useEffect(() => {
      if (typeof window === 'undefined' || !monacoInstance || !id) return;

      createModels(files);
      const provider = addSuggestions(Object.keys(files || {}));

      return () => provider?.dispose();
    }, [files, monacoInstance]);

    useEffect(() => {
      if (typeof window === 'undefined' || !monacoInstance) return;

      const controllers = new Map<string, AbortController>();
      Promise.all(
        Object.entries(imports || {}).map(async ([name, url]) => {
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
        .then(addExtraLib);

      return () => {
        controllers.forEach(controller => controller.abort());
      };
    }, [imports, monacoInstance]);

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

    return <MonacoEditor value={value} language={language} options={mergedOptions} width={width ?? '100%'} height={height} {...rest} onMount={handleEditorDidMount} onChange={handleEditorContentChange} />;
  }),
  createAdapter: instance => {
    return new MonacoEditorAdapter(EditorEngine.Monaco, instance);
  }
};
