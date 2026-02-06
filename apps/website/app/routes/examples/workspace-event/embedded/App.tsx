import { Codespark, type Workspace } from '@codespark/react';
import { useEffect, useRef } from 'react';

export default function App() {
  const workspace = useRef<Workspace>(null);

  useEffect(() => {
    if (!workspace.current) return;

    return workspace.current.on('fileChange', (name, content) => {
      console.log({ name, content });
    });
  }, []);

  return <Codespark getWorkspace={workspace} />;
}
