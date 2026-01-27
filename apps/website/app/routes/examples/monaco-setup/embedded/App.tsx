import { Codespark } from '@codespark/react';
import { Monaco } from '@codespark/react/monaco';

const code = `export default function App() {
  return (
    <div className="text-center">
      <h1 className="text-xl font-bold">Hello World</h1>
      <p>This is my first Codes Park!</p>
    </div>
  );
}`;

export default function () {
  return <Codespark editor={Monaco} code={code} />;
}
