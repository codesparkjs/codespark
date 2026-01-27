import { EditorView } from '@uiw/react-codemirror';

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
