import { markdown } from '@codespark/framework/markdown';
import { Codespark } from '@codespark/react';

export default function App() {
  return <Codespark name="index.md" code="# Hello World" framework={markdown} tailwindcss={false} />;
}
