import { CodesparkEditor, CodesparkPreview, CodesparkProvider } from '@codespark/react';

const code = `export default function App() {
  return (
    <div className="text-center">
      <h1 className="text-xl font-bold">Hello World</h1>
      <p>This is my first Codes Park!</p>
    </div>
  );
}`;

export default function App() {
  return (
    <CodesparkProvider>
      <div className="border-border grid grid-cols-3 divide-x overflow-hidden rounded-lg border">
        <div className="border-border col-span-2">
          <div className="bg-muted/50 border-border flex items-center gap-2 border-b px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <CodesparkEditor height="400px" value={code} toolbox={false} />
        </div>
        <CodesparkPreview className="h-full" />
      </div>
    </CodesparkProvider>
  );
}
