import type * as monaco from 'monaco-editor';

import { type EditorAdapter, EditorEngine } from '@/lib/editor-adapter';

export class MonacoEditorAdapter implements EditorAdapter<EditorEngine.Monaco> {
  constructor(
    public kind: EditorEngine.Monaco,
    public instance: monaco.editor.IStandaloneCodeEditor
  ) {}

  getValue() {
    return this.instance.getModel()?.getValue() ?? '';
  }

  setValue(value: string, _addToHistory?: boolean) {
    this.instance.getModel()?.setValue(value);
  }

  async format() {
    await this.instance.getAction('editor.action.formatDocument')?.run();
  }
}
