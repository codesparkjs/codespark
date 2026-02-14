import { Framework as Base } from '@codespark/framework';
import { createRuntime, getServerBridge, type IRuntime, PackageManager, resetServerBridge, type ServerBridge, stream, VirtualFS, ViteDevServer } from 'almostnode';

import { LoaderType } from '../loaders/types';
import type { Outputs } from '../registry';
import { analyze } from './analyze';

const SHIMMED_MODULES = [
  'assert',
  'buffer',
  'child_process',
  'console',
  'crypto',
  'dns',
  'events',
  'fs',
  'http',
  'https',
  'module',
  'net',
  'os',
  'path',
  'process',
  'querystring',
  'readline',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'vm',
  'worker_threads',
  'zlib'
];

export class Framework extends Base {
  readonly name: string = 'node';
  readonly imports = {};
  outputs: Outputs = new Map();

  protected entry?: string;
  protected vfs: VirtualFS;

  constructor() {
    super();
    this.vfs = new VirtualFS();
  }

  analyze(files: Record<string, string>) {
    this.outputs = analyze(files);
  }

  compile(entry: string) {
    this.entry = entry;

    const assets = this.getOutput(LoaderType.Asset);
    const styles = this.getOutput(LoaderType.Style);
    const modules = this.getOutput(LoaderType.ESModule);

    for (const { path, content, raw } of modules) {
      const oldContent = this.vfs.existsSync(path) ? this.vfs.readFileSync(path, 'utf-8') : '';
      const newContent = path === './package.json' ? raw : content;

      if (oldContent !== newContent) {
        this.vfs.writeFileSync(path, newContent);
      }
    }

    for (const { path, content } of [...assets, ...styles]) {
      const oldContent = this.vfs.existsSync(path) ? this.vfs.readFileSync(path, 'utf-8') : '';
      const newContent = content;

      if (oldContent !== newContent) {
        this.vfs.writeFileSync(path, newContent);
      }
    }

    return this.createBuilder().done();
  }
}

export interface NodeFrameworkEvents {
  log: (message: string, type: 'info' | 'error' | 'success') => void;
}

export class NodeFramework<Events extends NodeFrameworkEvents> extends Framework {
  protected npm?: PackageManager;
  protected runtime?: IRuntime;
  protected console: { method: string; args: unknown[] }[] = [];

  private runtimeReady: Promise<void>;
  private _listeners: { [K in keyof Events]?: Events[K][] } = {};

  constructor() {
    super();
    this.runtimeReady = this.initRuntime();
  }

  private async initRuntime() {
    this.npm = new PackageManager(this.vfs);
    this.runtime = await createRuntime(this.vfs, {
      dangerouslyAllowSameOrigin: true,
      useWorker: false,
      onConsole: (method, args) => {
        this.console.push({ method, args });
        this.log(args[0] as string);
      }
    });
  }

  private removeDir(path: string): void {
    const entries = this.vfs.readdirSync(path);
    for (const entry of entries) {
      const fullPath = `${path}/${entry}`;
      const stat = this.vfs.statSync(fullPath);
      if (stat.isDirectory()) {
        this.removeDir(fullPath);
      } else {
        this.vfs.unlinkSync(fullPath);
      }
    }
    this.vfs.rmdirSync(path);
  }

  private checkMissingPackages() {
    if (!this.npm) return false;

    const modules = this.getOutput(LoaderType.ESModule);
    const requiredPackages = new Set(modules.flatMap(m => m.externals.map(e => e.name)));
    const installedPackages = new Set(Object.keys(this.npm.list()));
    const missingPackages = [...requiredPackages].filter(pkg => !installedPackages.has(pkg) && !SHIMMED_MODULES.includes(pkg));

    if (missingPackages.length > 0) {
      const error = new Error(`Missing dependencies: ${missingPackages.join(', ')}. Please install them first.`);
      this.console.push({ method: 'error', args: [error.message] });

      return false;
    }

    return true;
  }

  private off<K extends keyof Events>(event: K, callback: Events[K]) {
    const listeners = this._listeners[event];
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  protected emit<K extends keyof Events>(event: K, ...args: any[]) {
    this._listeners[event]?.forEach(fn => (fn as (...args: any[]) => void)(...args));
  }

  protected log(message: string, type: 'info' | 'error' | 'success' = 'info') {
    this.emit('log', message, type);
  }

  async install(options?: Parameters<PackageManager['installFromPackageJson']>[0]) {
    if (!this.npm) throw new Error('Runtime not initialized');

    const pkgJsonPath = './package.json';
    if (this.vfs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(this.vfs.readFileSync(pkgJsonPath, 'utf-8') as string);
      const declaredDeps = new Set([...Object.keys(pkgJson.dependencies || {}), ...Object.keys(pkgJson.devDependencies || {})]);
      const installedPkgs = Object.keys(this.npm.list());

      for (const pkg of installedPkgs) {
        if (!declaredDeps.has(pkg)) {
          this.uninstall(pkg);
        }
      }

      await this.npm.installFromPackageJson({
        ...options,
        onProgress: msg => {
          options?.onProgress?.(msg);
          this.log(msg);
        }
      });
    } else {
      const requiredPackages = [...new Set(this.getOutput(LoaderType.ESModule).flatMap(m => m.externals.map(e => e.name)))].filter(pkg => !SHIMMED_MODULES.includes(pkg));
      for (const packageSpec of requiredPackages) {
        await this.npm.install(packageSpec, {
          ...options,
          onProgress: msg => {
            options?.onProgress?.(msg);
            this.log(msg);
          }
        });
      }
    }
  }

  uninstall(packageName: string) {
    if (!this.npm) throw new Error('Runtime not initialized');

    const pkgPath = `/node_modules/${packageName}`;
    if (this.vfs.existsSync(pkgPath)) {
      this.removeDir(pkgPath);
    }

    const pkgJsonPath = './package.json';
    if (this.vfs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(this.vfs.readFileSync(pkgJsonPath, 'utf-8') as string);
      const { [packageName]: _dep, ...restDeps } = pkgJson.dependencies || {};
      const { [packageName]: _devDep, ...restDevDeps } = pkgJson.devDependencies || {};
      pkgJson.dependencies = restDeps;
      pkgJson.devDependencies = restDevDeps;
      this.vfs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
    }
  }

  async run(entry = this.entry) {
    if (!entry) return;

    await this.runtimeReady;
    if (!this.runtime || !this.checkMissingPackages()) return;

    try {
      return await this.runtime.runFile(entry);
    } catch (error) {
      this.console.push({
        method: 'error',
        args: [(error as Error).stack || (error as Error).message]
      });
    }
  }

  on<K extends keyof Events>(event: K, callback: Events[K]) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event]!.push(callback);

    return () => this.off(event, callback);
  }
}

export interface HttpFrameworkEvents extends NodeFrameworkEvents {
  serverReady: (port: number, url: string) => void;
  serverShutdown: () => void;
}

export class HttpFramework extends NodeFramework<HttpFrameworkEvents> {
  readonly name: string = 'node-http';
  bridge?: ServerBridge;
  port: number | null = null;

  private wrapHtml(html: string) {
    return `<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: monospace; }
      pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
  </head>
  <body>
    <pre>${html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </body>
</html>`;
  }

  private injectLinkInterceptor(html: string) {
    const script = `
    <script>
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link) {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href) {
            if (href.startsWith('/')) {
              window.parent.postMessage({ type: 'navigate', path: href }, '*');
            } else if (href.startsWith('http')) {
              try {
                const url = new URL(href);
                window.parent.postMessage({ type: 'navigate', path: url.pathname + url.search }, '*');
              } catch (e) {
                console.error('Invalid URL:', href);
              }
            } else {
              window.parent.postMessage({ type: 'navigate', path: '/' + href }, '*');
            }
          }
        }
      });
    </script>
  `;

    if (html.includes('</body>')) {
      return html.replace('</body>', script + '</body>');
    }

    return html + script;
  }

  private initServerBridge() {
    resetServerBridge();
    this.bridge = getServerBridge({ baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost' });
    this.bridge.on('server-ready', (port: number, url: string) => {
      this.port = port;
      this.log(`Server ready at ${url}`);
      this.emit('serverReady', port, url);
    });
  }

  async request(path: string) {
    const port = this.port;
    const bridge = this.bridge;

    if (!port || !bridge) return 'about:blank';

    try {
      const response = await bridge.handleRequest(port, 'GET', path, {
        host: 'localhost',
        'user-agent': 'CodesparkNode/1.0'
      });

      const contentType = response.headers['content-type'] || 'text/plain';
      const body = response.body.toString();

      let html: string;
      if (contentType.includes('text/html')) {
        html = this.injectLinkInterceptor(body);
      } else if (contentType.includes('application/json')) {
        html = this.wrapHtml(JSON.stringify(JSON.parse(body), null, 2));
      } else {
        html = this.wrapHtml(body);
      }

      return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    } catch (error) {
      this.console.push({
        method: 'error',
        args: [(error as Error).stack || (error as Error).message]
      });
    }

    return 'about:blank';
  }

  async start() {
    this.initServerBridge();

    await this.run();
  }

  stop() {
    this.bridge?.unregisterServer(this.port ?? 3000);
    this.port = null;
    this.emit('serverShutdown');
  }
}

export interface ViteFrameworkEvents extends NodeFrameworkEvents {
  serverReady: (port: number, url: string) => void;
  serverShutdown: () => void;
}

export class ViteFramework extends NodeFramework<ViteFrameworkEvents> {
  readonly name: string = 'node-vite';
  bridge?: ServerBridge;
  port: number | null = null;

  private devServer?: ViteDevServer;

  private async initServerBridge() {
    resetServerBridge();
    this.bridge = getServerBridge();
    this.bridge.on('server-ready', (port: number, url: string) => {
      this.port = port;
      this.log(`Server ready at ${url}`);
      this.emit('serverReady', port, url);
    });
    try {
      this.log('Initializing Service Worker...');
      await this.bridge.initServiceWorker();
      this.log('Service Worker ready');
    } catch (error) {
      this.log(`Warning: Service Worker failed to initialize: ${error}`);
      this.log('Falling back to direct request handling...');
    }
  }

  async request(path: string) {
    const port = this.port;
    const bridge = this.bridge;

    if (!port || !bridge) return 'about:blank';

    const baseUrl = bridge.getServerUrl(port);

    return `${baseUrl}${path}`;
  }

  async start(options: { hmrTarget?: Window | null } = {}) {
    const port = this.port ?? 5173;
    const { hmrTarget } = options;

    const devServer = new ViteDevServer(this.vfs, { port, root: '/' });

    await this.initServerBridge();
    this.bridge!.registerServer(
      {
        listening: true,
        address: () => ({ port, address: '0.0.0.0', family: 'IPv4' }),
        handleRequest: async (method: string, url: string, headers: Record<string, string>, body?: string) => {
          const bodyBuffer = body ? (typeof body === 'string' ? stream.Buffer.from(body) : body) : undefined;

          return devServer.handleRequest(method, url, headers, bodyBuffer);
        }
      },
      port
    );

    if (hmrTarget) {
      devServer.setHMRTarget(hmrTarget);
      devServer.on('hmr-update', (update: unknown) => {
        this.log(`HMR update: ${JSON.stringify(update)}`);
      });
    }

    devServer.start();
    this.devServer = devServer;
  }

  stop() {
    this.bridge?.unregisterServer(this.port ?? 5173);
    this.port = null;
    this.devServer?.stop();
    this.emit('serverShutdown');
  }
}

export const node = new NodeFramework();

export const http = new HttpFramework();

export const vite = new ViteFramework();
