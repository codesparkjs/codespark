import { http } from '@codespark/framework/node';
import { CodesparkBrowser, CodesparkEditor, CodesparkProvider, Workspace } from '@codespark/react';
import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';

const workspace = new Workspace({
  framework: http,
  entry: './index.ts',
  files: {
    './index.ts': `import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/api/time') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ time: new Date().toISOString() }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(\`
    <body style="font-family:system-ui;padding:2rem;background:#f8f9fa">
      <h1>Hello from the browser!</h1>
      <p>This server runs entirely in your browser.</p>
      <a href="/api/time">Check /api/time →</a>
    </body>
  \`);
});

server.listen(3001);`
  }
});

export default function App() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ time: number; message: string }[]>([]);

  useEffect(() => {
    http.on('serverReady', () => {
      setRunning(true);
    });

    http.on('serverShutdown', () => {
      setRunning(false);
    });

    http.on('log', message => {
      setLogs(logs => [...logs, { time: Date.now(), message }]);
    });
  }, []);

  return (
    <CodesparkProvider workspace={workspace}>
      <div className="border-border relative flex w-full divide-x overflow-hidden rounded-lg border">
        <div className="border-border flex w-0 flex-1 flex-col">
          <CodesparkEditor height="400px" />
          <div className="border-border flex-1 divide-y border-t">
            <div className="border-border text-muted-foreground box-content flex h-8 items-center justify-between px-4 py-2 pr-2 text-xs uppercase">
              Terminal
              <button
                disabled={loading}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-2.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                onClick={async () => {
                  setLogs([]);
                  if (running) {
                    http.stop();
                  } else {
                    setLoading(true);
                    await http.install({ includeDev: true });
                    await http.start();
                    setLoading(false);
                  }
                }}>
                {running ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
                {running ? 'Stop' : 'Run'}
              </button>
            </div>
            <div className="bg-muted/30 h-50 overflow-y-auto font-mono text-xs">
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
                <div className="px-4 py-2">Click Run button to start server...</div>
              )}
            </div>
          </div>
        </div>
        <CodesparkBrowser loading={loading} className="w-75" />
      </div>
    </CodesparkProvider>
  );
}
