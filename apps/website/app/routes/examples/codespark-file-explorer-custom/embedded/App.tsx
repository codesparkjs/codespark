import { CodesparkFileExplorer, CodesparkProvider, Workspace } from '@codespark/react';
import { ChevronRight, FileCode, Folder, FolderOpen } from 'lucide-react';

const workspace = new Workspace({
  entry: './App.tsx',
  files: {
    './App.tsx': '',
    './src/index.ts': '',
    './components/button.tsx': '',
    './components/input.tsx': ''
  }
});

export default function App() {
  return (
    <CodesparkProvider workspace={workspace}>
      <CodesparkFileExplorer
        defaultOpen
        renderItem={({ node, isSelected, isOpen }) => {
          if (node.type === 'file') {
            return (
              <>
                <FileCode className={`size-4 ${isSelected ? 'text-blue-500' : ''}`} />
                <span className={`truncate ${isSelected ? 'font-bold' : ''}`}>{node.name}</span>
              </>
            );
          }

          return (
            <>
              <ChevronRight className="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
              {isOpen ? <FolderOpen className="size-4 text-yellow-500" /> : <Folder className="size-4 text-yellow-500" />}
              <span className="truncate">{node.name}</span>
            </>
          );
        }}
      />
    </CodesparkProvider>
  );
}
