import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type * as monaco from 'monaco-editor';

export enum EditorEngine {
  Monaco,
  CodeMirror
}

interface EditorInstance {
  [EditorEngine.Monaco]: monaco.editor.IStandaloneCodeEditor;
  [EditorEngine.CodeMirror]: ReactCodeMirrorRef;
}

export interface EditorAdapter<E extends EditorEngine = any> {
  kind: E;
  instance: EditorInstance[E];
  getValue(): string;
  setValue(value: string): void;
  format(): Promise<void>;
}
