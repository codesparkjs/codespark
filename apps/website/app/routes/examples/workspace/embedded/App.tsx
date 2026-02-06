import { Codespark, type Workspace } from '@codespark/react';
import { useEffect, useRef } from 'react';

const code = `export default function App() {
  return <div>Hello World</div>;
}`;

export default function App() {
  const workspace = useRef<Workspace>(null);

  useEffect(() => {
    console.log(workspace.current?.files); // { './App.tsx': 'export default ...' }
  }, []);

  return <Codespark getWorkspace={workspace} code={code} />;
}
