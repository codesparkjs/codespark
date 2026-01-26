import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type * as monaco from 'monaco-editor';
import type { ComponentType } from 'react';

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

export interface EditorEngineComponent<E extends EditorEngine = any, P = unknown, I = unknown> {
  kind: E;
  Component: ComponentType<P>;
  createAdapter: (instance: I) => EditorAdapter<E>;
}
