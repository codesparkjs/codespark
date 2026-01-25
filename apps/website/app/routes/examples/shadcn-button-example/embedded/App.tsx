import { Codespark } from '@codespark/react';

import { APP, BUTTON, STYLE, UTILS } from './files';

const files = {
  './App.tsx': APP,
  './components/ui/button.tsx': BUTTON,
  './lib/utils.ts': UTILS,
  './style.tw.css': STYLE
};

export default function App() {
  return <Codespark files={files} />;
}
