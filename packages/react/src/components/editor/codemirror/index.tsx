import { javascript } from '@codemirror/lang-javascript';
import ReactCodeMirror, { type ReactCodeMirrorProps, type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useEffect, useRef } from 'react';

import { EditorEngine, EditorEngineComponent } from '@/lib/editor-adapter';

import { CodeMirrorEditorAdapter } from './adapter';
import { theme } from './theme';

const EXTENSIONS = [javascript({ jsx: true }), theme];

export interface CodeMirrorProps extends ReactCodeMirrorProps {
  readonly id?: string;
  onMount?: (editor: ReactCodeMirrorRef) => void;
}

export const CodeMirror: EditorEngineComponent<EditorEngine.CodeMirror, CodeMirrorProps, ReactCodeMirrorRef> = {
  kind: EditorEngine.CodeMirror,
  Component: function CodeMirror(props) {
    const { basicSetup, extensions = [], onMount, ...rest } = props;
    const editorRef = useRef<ReactCodeMirrorRef>(null);

    useEffect(() => {
      if (editorRef.current) {
        onMount?.(editorRef.current);
      }
    }, []);

    return (
      <ReactCodeMirror
        ref={editorRef}
        height="100%"
        basicSetup={
          typeof basicSetup === 'boolean'
            ? basicSetup
            : {
                lineNumbers: true,
                foldGutter: false,
                highlightActiveLine: true,
                highlightActiveLineGutter: false,
                ...basicSetup
              }
        }
        extensions={[...EXTENSIONS, ...extensions]}
        {...rest}
      />
    );
  },
  createAdapter: instance => {
    return new CodeMirrorEditorAdapter(EditorEngine.CodeMirror, instance);
  }
};
