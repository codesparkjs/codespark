import { Framework } from '@codespark/framework/html';
import { CodesparkEditor, CodesparkPreview, CodesparkProvider, useWorkspace, Workspace } from '@codespark/react';
import { Braces, Code, Palette } from 'lucide-react';
import { useMemo, useState } from 'react';

const files = [
  { name: './index.html', label: 'HTML', icon: Code, content: '<div id="app"></div>' },
  { name: './index.js', label: 'JS', icon: Braces, content: 'document.getElementById("app").textContent = "Hello!";' },
  { name: './index.css', label: 'CSS', icon: Palette, content: '#app { color: blue; font-size: 24px; }' }
];

function Toolbar() {
  const { workspace } = useWorkspace();
  const [active, setActive] = useState('./index.html');

  return (
    <div className="border-border flex items-center gap-2 border-b p-2">
      {files.map(file => (
        <button
          key={file.name}
          onClick={() => {
            setActive(file.name);
            workspace.setCurrentFile(file.name);
          }}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${active === file.name ? 'shadow' : 'bg-muted'}`}>
          <file.icon className="size-3" />
          {file.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const workspace = useMemo(
    () =>
      new Workspace({
        entry: './index.html',
        files: files.reduce((pre, { name, content }) => ({ ...pre, [name]: content }), {}),
        framework: new Framework({ liteMode: { enabled: true } })
      }),
    []
  );

  return (
    <CodesparkProvider workspace={workspace}>
      <div className="border-border grid grid-cols-3 divide-x overflow-hidden rounded-lg border">
        <div className="border-border col-span-2">
          <Toolbar />
          <CodesparkEditor height="403px" toolbox={false} />
        </div>
        <CodesparkPreview className="h-full" tailwindcss={false} />
      </div>
    </CodesparkProvider>
  );
}
