import { shikiToMonaco } from '@shikijs/monaco';
import ReactDts from 'node_modules/@types/react/index.d.ts?raw';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import prettier from 'prettier/standalone';
import { createHighlighter } from 'shiki';

import { AVAILABLE_THEMES } from './themes';

let initialized = false;

export const setup = async () => {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const [{ loader }, monaco, { default: editorWorker }, { default: cssWorker }, { default: htmlWorker }, { default: jsonWorker }, { default: tsWorker }, highlighter] = await Promise.all([
    import('@monaco-editor/react'),
    import('monaco-editor'),
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/css/css.worker?worker'),
    import('monaco-editor/esm/vs/language/html/html.worker?worker'),
    import('monaco-editor/esm/vs/language/json/json.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    createHighlighter({
      themes: [AVAILABLE_THEMES.light, AVAILABLE_THEMES.dark],
      langs: ['typescript', 'tsx', 'javascript', 'jsx', 'json', 'css', 'html']
    })
  ]);

  window.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker();
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker();
      }
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    }
  };

  loader.config({ monaco });
  loader
    .init()
    .then((Monaco: typeof monaco) => {
      // Register Shiki languages for syntax highlighting
      shikiToMonaco(highlighter, Monaco);

      Monaco.typescript.typescriptDefaults.setEagerModelSync(true);

      Monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      });

      Monaco.typescript.typescriptDefaults.setCompilerOptions({
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        allowUnreachableCode: true,
        allowUnusedLabels: true,
        target: Monaco.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: Monaco.typescript.ModuleResolutionKind.NodeJs,
        module: Monaco.typescript.ModuleKind.ESNext,
        noEmit: true,
        jsx: Monaco.typescript.JsxEmit.ReactJSX,
        esModuleInterop: true,
        typeRoots: ['node_modules/@types']
      });

      Monaco.typescript.typescriptDefaults.addExtraLib(ReactDts, 'file:///node_modules/@types/react/index.d.ts');

      Monaco.typescript.typescriptDefaults.addExtraLib(
        `declare module 'react/jsx-runtime' {
          import * as React from 'react';
          export { Fragment } from 'react';
          export function jsx(type: any, props: any, key?: string): React.ReactElement;
          export function jsxs(type: any, props: any, key?: string): React.ReactElement;
          export namespace JSX {
            type Element = React.ReactElement;
            interface IntrinsicElements extends React.JSX.IntrinsicElements {}
          }
        }`,
        'file:///node_modules/@types/react/jsx-runtime.d.ts'
      );

      Monaco.typescript.typescriptDefaults.addExtraLib(
        `import * as React from 'react';
        declare global {
          namespace JSX {
            type Element = React.ReactElement;
            interface IntrinsicElements extends React.JSX.IntrinsicElements {}
          }
        }`,
        'file:///global-jsx.d.ts'
      );

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
    .catch(() => {
      //
    });
};
