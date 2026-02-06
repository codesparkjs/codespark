import { CodesparkEditor, CodesparkFileExplorer, CodesparkProvider, useWorkspace } from '@codespark/react';
import { FilePlus, FileText, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const defaultAppCode = `export default function App() {
  return <div className="p-4 text-center">Hello World</div>;
}`;

const initialFiles = {
  './App.tsx': defaultAppCode
};

function Console({ logs }: { logs: { type: string; message: string }[] }) {
  return (
    <div className="h-[140px] space-y-1.5 overflow-auto p-3 font-mono text-xs">
      {logs.length === 0 ? (
        <p className="text-muted-foreground">Waiting for events...</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 text-sky-500">[{log.type}]</span>
            <span className="text-foreground">{log.message}</span>
          </div>
        ))
      )}
    </div>
  );
}

function FileActions({ onReset }: { onReset: () => void }) {
  const { workspace } = useWorkspace();

  const createFile = () => {
    const name = `./file-${Date.now().toString().slice(-4)}.ts`;
    workspace.setFile(name, `export const value = ${Math.floor(Math.random() * 100)};`);
    workspace.setCurrentFile(name);
  };

  const updateCurrentFile = () => {
    const current = workspace.currentFile;
    if (current && current.path !== './App.tsx') {
      workspace.setFile(current.path, current.code + `\n// Updated`);
    }
  };

  const renameCurrentFile = () => {
    const current = workspace.currentFile;
    if (current && current.path !== './App.tsx') {
      const newName = `renamed-${Date.now().toString().slice(-4)}.ts`;
      workspace.renameFile(current.path, newName);
    }
  };

  const deleteCurrentFile = () => {
    const current = workspace.currentFile;
    if (current && current.path !== './App.tsx') {
      workspace.deleteFile(current.path);
      workspace.setCurrentFile('./App.tsx');
    }
  };

  const isEntryFile = workspace.currentFile?.path === './App.tsx';

  return (
    <div className="border-border flex flex-wrap gap-2 p-2">
      <button onClick={createFile} className="bg-muted hover:bg-muted/80 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium">
        <FilePlus className="h-3.5 w-3.5" /> Create
      </button>
      <button onClick={updateCurrentFile} disabled={isEntryFile} className="bg-muted hover:bg-muted/80 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50">
        <FileText className="h-3.5 w-3.5" /> Update
      </button>
      <button onClick={renameCurrentFile} disabled={isEntryFile} className="bg-muted hover:bg-muted/80 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50">
        <Pencil className="h-3.5 w-3.5" /> Rename
      </button>
      <button onClick={deleteCurrentFile} disabled={isEntryFile} className="bg-muted hover:bg-muted/80 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
      <div className="flex-1" />
      <button onClick={onReset} className="bg-muted hover:bg-muted/80 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium">
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </button>
    </div>
  );
}

export default function App() {
  const { workspace, files } = useWorkspace({ entry: './App.tsx', files: initialFiles });
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([]);

  const addLog = (type: string, message: string) => {
    setLogs(prev => [...prev, { type, message }].slice(-10));
  };

  useEffect(() => {
    const unsubscribes = [
      workspace.on('fileChange', (path, content) => {
        addLog('fileChange', `${path} (${content.length} chars)`);
      }),
      workspace.on('fileRename', (oldPath, newPath) => {
        addLog('fileRename', `${oldPath} → ${newPath}`);
      }),
      workspace.on('fileDelete', path => {
        addLog('fileDelete', path);
      }),
      workspace.on('currentFileChange', file => {
        addLog('currentFileChange', file.path);
      })
    ];
    return () => unsubscribes.forEach(fn => fn());
  }, [workspace]);

  const handleReset = () => {
    Object.keys(files).forEach(path => {
      if (path !== './App.tsx') workspace.deleteFile(path);
    });
    workspace.setFile('./App.tsx', defaultAppCode);
    workspace.setCurrentFile('./App.tsx');
    setTimeout(() => setLogs([]), 0);
  };

  return (
    <CodesparkProvider workspace={workspace}>
      <div className="border-border divide-y overflow-hidden rounded-xl border">
        <FileActions onReset={handleReset} />
        <div className="border-border flex">
          <CodesparkFileExplorer className="border-border max-h-[350px] w-40 overflow-auto border-r" />
          <CodesparkEditor containerProps={{ className: 'w-0 flex-1' }} height="350px" toolbox={false} />
        </div>
        <Console logs={logs} />
      </div>
    </CodesparkProvider>
  );
}
