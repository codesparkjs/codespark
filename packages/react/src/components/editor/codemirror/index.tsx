import { javascript } from '@codemirror/lang-javascript';
import ReactCodeMirror, { type ReactCodeMirrorProps, type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useEffect, useRef } from 'react';

import { EditorEngine } from '@/lib/editor-adapter';

import { CodeMirrorEditorAdapter } from './adapter';
import { theme } from './theme';

const EXTENSIONS = [javascript({ jsx: true }), theme];

export function createCodeMirrorAdapter(instance: ReactCodeMirrorRef) {
  return new CodeMirrorEditorAdapter(EditorEngine.CodeMirror, instance);
}

export interface CodeMirrorProps extends ReactCodeMirrorProps {
  readonly id?: string;
  onMount?: (editor: ReactCodeMirrorRef) => void;
}

export function CodeMirror(props: CodeMirrorProps) {
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
}
