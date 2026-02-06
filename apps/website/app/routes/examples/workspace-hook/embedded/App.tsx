import { CodesparkEditor, CodesparkPreview, CodesparkProvider, useWorkspace } from '@codespark/react';
import { useEffect } from 'react';

export default function App() {
  const { workspace, files } = useWorkspace({ entry: './App.tsx', files: { './App.tsx': '' } });

  useEffect(() => {
    console.log('files:', files);
  }, [files]);

  return (
    <CodesparkProvider workspace={workspace}>
      <div className="border-border relative w-full divide-y overflow-hidden rounded-lg border">
        <CodesparkPreview className="border-border" />
        <CodesparkEditor />
      </div>
    </CodesparkProvider>
  );
}
