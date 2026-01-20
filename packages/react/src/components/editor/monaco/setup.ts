import { shikiToMonaco } from '@shikijs/monaco';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import prettier from 'prettier/standalone';
import { createHighlighter } from 'shiki';

import { AVAILABLE_THEMES } from './themes';

let initialized = false;

export const setup = async () => {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const [{ loader }, monaco, highlighter] = await Promise.all([
    import('@monaco-editor/react'),
    import('monaco-editor'),
    createHighlighter({
      themes: [AVAILABLE_THEMES.light, AVAILABLE_THEMES.dark],
      langs: ['typescript', 'tsx', 'javascript', 'jsx', 'json', 'css', 'html']
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

  loader.config({ monaco });
  loader.init().then((Monaco: typeof monaco) => {
    // Register Shiki languages for syntax highlighting
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
  });
};
