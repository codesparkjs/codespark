import { EditorView } from '@codemirror/view';

export const theme = EditorView.theme({
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
    paddingLeft: '12px',
    paddingRight: '4px',
    minWidth: '36px'
  },
  '.cm-line': {
    padding: '0 12px',
    height: '24px',
    lineHeight: '24px'
  }
});
