import { registerFramework } from '@codespark/framework';
import { markdown } from '@codespark/framework/markdown';
import { Codespark } from '@codespark/react';

registerFramework(markdown);

const code = '# hello world';

export default function App() {
  return <Codespark name="index.md" code={code} template="markdown" tailwindcss={false} />;
}
