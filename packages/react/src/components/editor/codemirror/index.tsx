import { javascript } from '@codemirror/lang-javascript';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import ReactCodeMirror, { EditorView, type Extension, type ReactCodeMirrorProps, type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { EditorEngine, EditorEngineComponent } from '@/lib/editor-adapter';
import { Skeleton } from '@/ui/skeleton';

import { CodeMirrorEditorAdapter } from './adapter';

const THEME = EditorView.theme({
  '&': {
    fontSize: '14px'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  '&.cm-editor': {
    backgroundColor: 'var(--background)'
  },
  '.cm-gutters.cm-gutters': {
    backgroundColor: 'var(--background)',
    border: 'none'
  },
  '.cm-gutter': {
    padding: '1px 4px 0px 12px',
    minWidth: '36px'
  },
  '.cm-scroller': {
    paddingTop: '8px',
    fontFamily: 'Fira Code'
  },
  '.cm-line': {
    padding: '0 12px',
    height: '24px',
    lineHeight: '24px'
  },
  '.cm-gutterElement.cm-gutterElement': {
    padding: '0px',
    lineHeight: '24px'
  },
  '.cm-activeLine': {
    borderRadius: '4px'
  }
});

const LANGUAGE_EXTENSIONS: Record<string, Extension> = {
  javascript: javascript({ jsx: true }),
  markdown: markdown({ base: markdownLanguage, codeLanguages: languages })
};

export interface CodeMirrorProps extends ReactCodeMirrorProps {
  readonly id?: string;
  onMount?: (editor: ReactCodeMirrorRef) => void;
  fontFamily?: string;
}

export const CodeMirror: EditorEngineComponent<EditorEngine.CodeMirror, CodeMirrorProps, ReactCodeMirrorRef> = {
  kind: EditorEngine.CodeMirror,
  Component: memo(function CodeMirror(props) {
    const { id, basicSetup, extensions = [], width, height, fontFamily, lang, onMount, ...rest } = props;
    const [mounted, setMounted] = useState(false);
    const editorRef = useRef<ReactCodeMirrorRef>(null);
    const allExtensions = useMemo(() => {
      const exts = [THEME, ...extensions];

      if (lang && LANGUAGE_EXTENSIONS[lang]) {
        exts.unshift(LANGUAGE_EXTENSIONS[lang]);
      } else {
        exts.unshift(LANGUAGE_EXTENSIONS.javascript);
      }

      if (fontFamily) exts.push(EditorView.theme({ '& .cm-scroller': { fontFamily } }));

      return exts;
    }, [extensions, fontFamily]);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (editorRef.current) {
        onMount?.(editorRef.current);
      }
    }, [mounted]);

    return (
      <div id={id} style={{ height }}>
        {!mounted ? (
          <div className="flex flex-col space-y-3 p-5" style={{ height }}>
            <Skeleton className="w-full flex-1 rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[65%]" />
            </div>
          </div>
        ) : (
          <ReactCodeMirror
            ref={editorRef}
            width={width ?? '100%'}
            height={height}
            basicSetup={
              typeof basicSetup === 'boolean'
                ? basicSetup
                : {
                    lineNumbers: true,
                    foldGutter: false,
                    highlightActiveLine: false,
                    highlightActiveLineGutter: false,
                    ...basicSetup
                  }
            }
            extensions={allExtensions}
            lang={lang}
            {...rest}
          />
        )}
      </div>
    );
  }),
  createAdapter: instance => {
    return new CodeMirrorEditorAdapter(EditorEngine.CodeMirror, instance);
  }
};
