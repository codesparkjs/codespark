import { node } from '@codespark/framework/node';
import { Codespark } from '@codespark/react';
import { Play } from 'lucide-react';
import { useEffect, useState } from 'react';

const files = {
  './index.js': `import _ from 'lodash-es';

console.log(_.capitalize('hello world'));`,
  './package.json': JSON.stringify(
    {
      name: 'codespark-node-demo',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        'lodash-es': '^4.17.21'
      }
    },
    null,
    2
  )
};

export default function App() {
  const [logs, setLogs] = useState<{ time: number; message: string }[]>([]);

  useEffect(() => {
    node.on('log', message => {
      setLogs(logs => [...logs, { time: Date.now(), message }]);
    });
  }, []);

  return (
    <div className="border-border divide-y rounded-lg border">
      <div className="border-border h-50 flex-1 overflow-y-auto font-mono text-xs">
        {logs.length > 0 ? (
          <>
            {logs.map(({ time, message }, index) => (
              <div key={index} className="hover:bg-muted/50 flex gap-3 px-3 py-1">
                <span className="text-muted-foreground/50 shrink-0">[{new Date(time).toLocaleTimeString()}]</span>
                <span className="text-foreground/90 break-all">{message}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="px-4 py-2">Click Run button to execute the script...</div>
        )}
      </div>
      <Codespark
        framework={node}
        showPreview={false}
        className="border-none"
        name="./index.js"
        files={files}
        toolbox={[
          {
            tooltip: 'Run',
            icon: <Play className="size-3.5" />,
            onClick: async () => {
              setLogs([]);
              await node.install({ includeDev: true });
              await node.run();
            }
          }
        ]}
      />
    </div>
  );
}
