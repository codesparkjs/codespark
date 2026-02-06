import { CodesparkEditor, CodesparkPreview, CodesparkProvider, useWorkspace } from '@codespark/react';
import { useEffect } from 'react';

export default function App() {
  // Create workspace outside of Provider
  const { workspace, compiled } = useWorkspace({
    entry: './App.tsx',
    files: {
      './App.tsx': 'export default () => <div>Hello</div>'
    }
  });

  const handleDeleteFile = () => {
    // you can use workspace methods here
    workspace.deleteFile('...');
  };

  useEffect(() => {
    // trigger every time when compiled code updated
    console.log('compiled code:', compiled);
  }, [compiled]);

  return (
    <CodesparkProvider workspace={workspace}>
      <CodesparkEditor />
      <CodesparkPreview />
    </CodesparkProvider>
  );
}
