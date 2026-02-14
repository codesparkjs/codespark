import { http, node, vite } from '@codespark/framework/node';
import { CodesparkBrowser, CodesparkEditor, CodesparkFileExplorer, CodesparkProvider, Workspace } from '@codespark/react';
import { Play, Square } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '~/components/ui/button';

const files1 = {
  './index.js': `const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(\`
    <body style="font-family:system-ui;padding:2rem;background:#f8f9fa">
      <h1>Express in the browser</h1>
      <p>Installed from npm, running client-side.</p>
      <a href="/api/hello">Try the API →</a>
    </body>
  \`);
});

app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from Express!',
    runtime: 'almostnode'
  });
});

app.listen(3000);`,
  './package.json': JSON.stringify(
    {
      name: 'codespark-node-demo',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        express: 'latest'
      }
    },
    null,
    2
  )
};

const files2 = {
  './vite.config.js': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
root: '/',
plugins: [react()],
server: {
  port: 3000,
  strictPort: true,
},
build: {
  outDir: 'dist',
},
});`,
  './index.html': `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>React + Vite Browser Demo</title>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0?dev",
    "react/": "https://esm.sh/react@18.2.0&dev/",
    "react-dom": "https://esm.sh/react-dom@18.2.0?dev",
    "react-dom/": "https://esm.sh/react-dom@18.2.0&dev/"
  }
}
</script>
</head>
<body>
<div id="root"></div>
<script type="module" src="./src/main.jsx"></script>
</body>
</html>`,
  './src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
  <App />
</React.StrictMode>
);`,
  './src/App.jsx': `import React, { useState } from 'react';
import Counter from './Counter.jsx';

function App() {
const [theme, setTheme] = useState('light');

const toggleTheme = () => {
  setTheme(theme === 'light' ? 'dark' : 'light');
};

return (
  <div className={\`app \${theme}\`}>
    <header>
      <h1>⚡ React + Vite in Browser</h1>
      <p>Running with shimmed Node.js APIs</p>
    </header>

    <main>
      <Counter />

      <div className="theme-toggle">
        <button onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>

      <div className="info-card">
        <h3>How it works</h3>
        <ul>
          <li>VirtualFS stores all files in memory</li>
          <li>Node.js APIs are shimmed for the browser</li>
          <li>Edit files on the left to see HMR updates</li>
        </ul>
      </div>
    </main>

    <footer>
      Made with 💜 WebContainers
    </footer>
  </div>
);
}

export default App;`,
  './src/Counter.jsx': `import React, { useState } from 'react';

function Counter() {
const [count, setCount] = useState(0);

return (
  <div className="counter-card">
    <h2>Interactive Counter</h2>
    <div className="counter-display">{count}</div>
    <div className="counter-buttons">
      <button onClick={() => setCount(c => c - 1)}>➖</button>
      <button onClick={() => setCount(0)}>Reset</button>
      <button onClick={() => setCount(c => c + 1)}>➕</button>
    </div>
  </div>
);
}

export default Counter;`,
  './src/style.css': `* {
box-sizing: border-box;
}

:root {
font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
line-height: 1.5;
}

body {
margin: 0;
min-height: 100vh;
}

.app {
min-height: 100vh;
display: flex;
flex-direction: column;
transition: all 0.3s ease;
}

.app.light {
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
color: white;
}

.app.dark {
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
color: #eee;
}

header {
text-align: center;
padding: 2rem;
}

header h1 {
font-size: 2.5rem;
margin: 0 0 0.5rem 0;
}

header p {
opacity: 0.8;
margin: 0;
}

main {
flex: 1;
display: flex;
flex-direction: column;
align-items: center;
gap: 1.5rem;
padding: 1rem;
}

.counter-card {
background: rgba(255, 255, 255, 0.15);
backdrop-filter: blur(10px);
border-radius: 16px;
padding: 2rem;
text-align: center;
min-width: 280px;
}

.counter-card h2 {
margin: 0 0 1rem 0;
}

.counter-display {
font-size: 4rem;
font-weight: bold;
margin: 1rem 0;
}

.counter-buttons {
display: flex;
gap: 0.5rem;
justify-content: center;
}

button {
padding: 0.75rem 1.5rem;
font-size: 1rem;
font-weight: 500;
border: none;
border-radius: 8px;
background: rgba(255, 255, 255, 0.2);
color: inherit;
cursor: pointer;
transition: all 0.2s ease;
}

button:hover {
background: rgba(255, 255, 255, 0.3);
transform: translateY(-2px);
}

button:active {
transform: translateY(0);
}

.theme-toggle button {
background: rgba(0, 0, 0, 0.2);
}

.info-card {
background: rgba(255, 255, 255, 0.1);
border-radius: 12px;
padding: 1.5rem;
max-width: 400px;
}

.info-card h3 {
margin: 0 0 1rem 0;
}

.info-card ul {
margin: 0;
padding-left: 1.5rem;
}

.info-card li {
margin: 0.5rem 0;
opacity: 0.9;
}

footer {
text-align: center;
padding: 1.5rem;
opacity: 0.7;
}`,
  './package.json': JSON.stringify(
    {
      name: 'react-vite-browser-demo',
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        vite: '^5.0.0',
        '@vitejs/plugin-react': '^4.2.0'
      }
    },
    null,
    2
  )
};

const file3 = {
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
};

const framework = http;

const workspace = new Workspace({ framework, entry: './index.ts', files: file3 });

export default function Test2() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ time: number; message: string }[]>([]);

  useEffect(() => {
    framework.on('serverReady', () => {
      setRunning(true);
    });

    framework.on('serverShutdown', () => {
      setRunning(false);
    });

    framework.on('log', message => {
      setLogs(logs => [...logs, { time: Date.now(), message }]);
    });
  }, []);

  return (
    <CodesparkProvider workspace={workspace}>
      <div className="border-border relative grid w-full grid-cols-[2fr_1fr] divide-x overflow-hidden rounded-lg border">
        <div className="flex divide-x">
          <CodesparkFileExplorer />
          <div className="flex w-0 flex-1 flex-col divide-y">
            <CodesparkEditor height="400px" />
            <div className="flex-1 divide-y">
              <div className="text-muted-foreground box-content flex h-8 items-center justify-between px-4 py-2 pr-2 text-xs uppercase">
                Terminal
                <Button
                  size="sm"
                  disabled={loading}
                  variant={'secondary'}
                  onClick={async () => {
                    setLogs([]);
                    if (running) {
                      framework.stop();
                    } else {
                      setLoading(true);
                      await framework.install({ includeDev: true });
                      await framework.start();
                      setLoading(false);
                    }
                  }}>
                  {running ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
                  {running ? 'Stop' : 'Run'}
                </Button>
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
        </div>
        <CodesparkBrowser loading={loading} />
      </div>
    </CodesparkProvider>
  );
}
