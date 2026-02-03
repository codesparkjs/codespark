import { type ReactCodeMirrorRef, Transaction } from '@uiw/react-codemirror';

import { type EditorAdapter, EditorEngine } from '@/lib/editor-adapter';

export class CodeMirrorEditorAdapter implements EditorAdapter<EditorEngine.CodeMirror> {
  constructor(
    public kind: EditorEngine.CodeMirror,
    public instance: ReactCodeMirrorRef
  ) {}

  getValue(): string {
    return this.instance.view?.state.doc.toString() ?? '';
  }

  setValue(value: string, addToHistory = false): void {
    const view = this.instance.view;
    if (!view) return;

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: addToHistory ? undefined : Transaction.addToHistory.of(false)
    });
  }

  async format(): Promise<void> {
    // CodeMirror doesn't have built-in format
  }
}
