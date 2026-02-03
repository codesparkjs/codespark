import type * as monaco from 'monaco-editor';

import { type EditorAdapter, EditorEngine } from '@/lib/editor-adapter';

export class MonacoEditorAdapter implements EditorAdapter<EditorEngine.Monaco> {
  constructor(
    public kind: EditorEngine.Monaco,
    public instance: monaco.editor.IStandaloneCodeEditor
  ) {}

  getValue(): string {
    return this.instance.getModel()?.getValue() ?? '';
  }

  setValue(value: string, _addToHistory?: boolean): void {
    this.instance.getModel()?.setValue(value);
  }

  async format(): Promise<void> {
    await this.instance.getAction('editor.action.formatDocument')?.run();
  }
}
