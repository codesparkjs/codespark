/* eslint-disable @typescript-eslint/no-explicit-any */
import srcdoc from './srcdoc.html?raw';

type MessageHandlers = Record<string, ((...args: any[]) => unknown) | undefined>;

export interface ProxyConfig {
  id?: string;
  root?: HTMLIFrameElement;
  handlers?: MessageHandlers;
  defaultTheme?: 'light' | 'dark';
  defaultPresets?: string[];
  defaultImports?: Record<string, string>;
}

let uid = 1;

export class PreviewProxy {
  iframe: HTMLIFrameElement;
  handleEvent: (e: any) => void;

  private pending_cmds: Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }>;
  private handlers?: MessageHandlers;

  constructor(config?: ProxyConfig) {
    const { id, root, handlers, defaultTheme = 'light', defaultImports = {}, defaultPresets = [] } = config || {};

    if (root) {
      this.iframe = root;
    } else {
      this.iframe = document.createElement('iframe');
      this.iframe.id = id ?? 'proxy_iframe';
    }
    this.iframe.setAttribute('sandbox', ['allow-forms', 'allow-modals', 'allow-pointer-lock', 'allow-popups', 'allow-same-origin', 'allow-scripts', 'allow-top-navigation-by-user-activation'].join(' '));
    this.iframe.src = URL.createObjectURL(
      new Blob(
        [
          srcdoc
            .replace(/DEFAULT_THEME/g, defaultTheme)
            .replace(/<!-- IMPORT_MAP -->/, JSON.stringify({ imports: defaultImports }))
            .replace(/<!-- PRESET_TAG -->/, defaultPresets.join('\n'))
        ],
        { type: 'text/html' }
      )
    );

    this.handlers = handlers;
    this.pending_cmds = new Map();
    this.handleEvent = e => this.handleReplMessage(e);
    window.addEventListener('message', this.handleEvent, false);

    this.iframe.addEventListener('load', () => {
      URL.revokeObjectURL(this.iframe.src);
    });
  }

  eval(script: string | string[]) {
    return this.iframeCommand('eval', { script });
  }

  destroy() {
    window.removeEventListener('message', this.handleEvent);
  }

  iframeCommand(action: string, args: any) {
    return new Promise((resolve, reject) => {
      const cmd_id = uid++;

      this.pending_cmds.set(cmd_id, { resolve, reject });
      this.iframe.contentWindow?.postMessage({ action, cmd_id, args }, '*');
    });
  }

  handleCommandMessage(cmd_data: any) {
    const action = cmd_data.action;
    const id = cmd_data.cmd_id;
    const handler = this.pending_cmds.get(id);

    if (handler) {
      this.pending_cmds.delete(id);
      if (action === 'cmd_error') {
        const { message, stack } = cmd_data;
        const e = new Error(message);
        e.stack = stack;
        handler.reject(e);
      }

      if (action === 'cmd_ok') {
        handler.resolve(cmd_data.args);
      }
    }
  }

  handleReplMessage(event: any) {
    if (event.source !== this.iframe.contentWindow) return;

    const { action, args } = event.data;
    switch (action) {
      case 'cmd_error':
      case 'cmd_ok':
        return this.handleCommandMessage(event.data);
      case 'fetch_progress':
        return this.handlers?.on_fetch_progress?.(args);
      case 'render_complete':
        return this.handlers?.on_render_complete?.();
      case 'error':
        return this.handlers?.on_error?.(event.data);
      case 'unhandledrejection':
        return this.handlers?.on_unhandled_rejection?.(event.data);
      case 'console':
        return this.handlers?.on_console?.(event.data);
      case 'console_group':
        return this.handlers?.on_console_group?.(event.data);
      case 'console_group_collapsed':
        return this.handlers?.on_console_group_collapsed?.(event.data);
      case 'console_group_end':
        return this.handlers?.on_console_group_end?.(event.data);
    }
  }

  handleLinks() {
    return this.iframeCommand('catch_clicks', {});
  }

  changeTheme(theme: 'light' | 'dark') {
    const root = this.iframe.contentDocument?.querySelector('html');
    if (root) {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      root.setAttribute('style', `color-scheme: ${theme}`);
    }
  }

  injectTags(tags?: string[]) {
    const doc = this.iframe.contentDocument;
    if (!doc) return;

    doc.querySelectorAll('[data-injected]').forEach(el => el.remove());
    if (tags?.length) {
      tags.forEach(tag => {
        const container = doc.createElement('div');
        container.innerHTML = tag;
        const el = container.firstElementChild;
        if (!el) return;
        if (el.tagName === 'SCRIPT') {
          const script = doc.createElement('script');
          Array.from(el.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
          script.textContent = el.textContent;
          script.setAttribute('data-injected', '');
          doc.head.appendChild(script);
        } else {
          el.setAttribute('data-injected', '');
          doc.head.appendChild(el);
        }
      });
    }
  }

  setImportMap(imports?: Record<string, string>) {
    const doc = this.iframe.contentDocument;
    if (!doc) return;

    const oldMap = doc.querySelector('script[type="importmap"]');
    if (oldMap) oldMap.remove();

    const script = doc.createElement('script');
    script.type = 'importmap';
    script.textContent = JSON.stringify({ imports: imports || {} });
    doc.head.insertBefore(script, doc.head.firstChild);
  }
}
