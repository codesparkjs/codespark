import { Codespark, EditorEngine } from '@codespark/react';
import { Codepen, Command } from 'lucide-react';
import { useState } from 'react';

const code = `export default function App() {
  return (
    <div className="text-center">
      <h1 className="text-xl font-bold">Hello World</h1>
      <p>This is my first Codes Park!</p>
    </div>
  );
}`;

export default function () {
  const [engine, setEngine] = useState(EditorEngine.CodeMirror);

  return (
    <Codespark
      editor={engine}
      code={code}
      toolbox={[
        {
          tooltip: 'Switch Editor Engine',
          icon: engine === EditorEngine.CodeMirror ? <Command className="size-3.5!" /> : <Codepen className="size-3.5!" />,
          onClick: () => {
            setEngine(engine === EditorEngine.CodeMirror ? EditorEngine.Monaco : EditorEngine.CodeMirror);
          }
        }
      ]}
    />
  );
}
