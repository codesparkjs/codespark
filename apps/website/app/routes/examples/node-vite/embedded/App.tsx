import { vite } from '@codespark/framework/node';
import { CodesparkBrowser, CodesparkEditor, CodesparkFileExplorer, CodesparkProvider, Workspace } from '@codespark/react';
import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';

const workspace = new Workspace({
  framework: vite,
  entry: './src/App.tsx',
  files: {
    './src/App.css': `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}`,
    './src/App.tsx': `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
`,
    './src/index.css': `:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}`,
    './src/main.tsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`,
    './vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})`,
    './index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codespark Vite</title>
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
  <script type="module" src="./src/main.tsx"></script>
</body>
</html>`,
    './package.json': JSON.stringify(
      {
        name: 'codespark-vite',
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
  }
});

export default function App() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ time: number; message: string }[]>([]);

  useEffect(() => {
    vite.on('serverReady', () => {
      setRunning(true);
    });

    vite.on('serverShutdown', () => {
      setRunning(false);
    });

    vite.on('log', message => {
      setLogs(logs => [...logs, { time: Date.now(), message }]);
    });
  }, []);

  return (
    <CodesparkProvider workspace={workspace}>
      <div className="border-border relative flex w-full divide-x overflow-hidden rounded-lg border">
        <div className="flex flex-1">
          <CodesparkFileExplorer defaultOpen />
          <div className="border-border flex w-0 flex-1 flex-col border-l">
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
                      vite.stop();
                    } else {
                      setLoading(true);
                      await vite.install({ includeDev: true });
                      await vite.start();
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
        </div>
        <CodesparkBrowser
          loading={loading}
          className="w-75"
          onLoad={iframe => {
            const hmrTarget = iframe.contentWindow;
            if (hmrTarget) {
              vite.setHMRTarget(hmrTarget);
            }
          }}
        />
      </div>
    </CodesparkProvider>
  );
}
