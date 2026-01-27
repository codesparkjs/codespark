import { javascript } from '@codemirror/lang-javascript';
import ReactCodeMirror, { type ReactCodeMirrorProps, type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useEffect, useRef, useState } from 'react';

import { EditorEngine, EditorEngineComponent } from '@/lib/editor-adapter';
import { Skeleton } from '@/ui/skeleton';

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
    const { id, basicSetup, extensions = [], width, height, onMount, ...rest } = props;
    const [mounted, setMounted] = useState(false);
    const editorRef = useRef<ReactCodeMirrorRef>(null);

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
            extensions={[...EXTENSIONS, ...extensions]}
            {...rest}
          />
        )}
      </div>
    );
  },
  createAdapter: instance => {
    return new CodeMirrorEditorAdapter(EditorEngine.CodeMirror, instance);
  }
};
