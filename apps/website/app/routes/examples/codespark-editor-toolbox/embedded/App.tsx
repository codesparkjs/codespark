import { CodesparkEditor } from '@codespark/react';
import { Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="space-y-4">
      <div className="border-border rounded-lg border p-2">
        Hide toolbar:
        <CodesparkEditor toolbox={false} />
      </div>
      <div className="border-border rounded-lg border p-2">
        Custom toolbar:
        <CodesparkEditor toolbox={['copy', 'format']} />
      </div>
      <div className="border-border rounded-lg border p-2">
        Custom tool item:
        <CodesparkEditor
          toolbox={[
            'copy',
            {
              tooltip: 'My Custom Action',
              icon: <Sparkles />,
              onClick: editor => console.log(editor?.instance)
            }
          ]}
        />
      </div>
    </div>
  );
}
