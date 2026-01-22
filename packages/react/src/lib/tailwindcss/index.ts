import { useRef } from 'react';
import * as tailwindcss from 'tailwindcss';

import * as assets from './assets';

class TailwindCSSJit {
  static STYLE_TYPE = 'text/tailwindcss';

  compiler?: Awaited<ReturnType<typeof tailwindcss.compile>>;

  private classes = new Set<string>();
  private lastCss = '';
  private buildQueue = Promise.resolve<string | undefined>('');

  constructor(private env: Document = document) {}

  rebuild(kind: 'full' | 'incremental') {
    const run = async (): Promise<string | undefined> => {
      if (!this.compiler && kind !== 'full') {
        return;
      }

      if (kind === 'full') {
        await this.createCompiler();
      }

      return this.build(kind);
    };

    this.buildQueue = this.buildQueue.then(run);

    return this.buildQueue as Promise<string | undefined>;
  }

  get stylesheets(): Iterable<HTMLStyleElement> {
    return this.env.querySelectorAll(`style[type="${TailwindCSSJit.STYLE_TYPE}"]`);
  }

  private async createCompiler() {
    let css = '';
    for (const sheet of this.stylesheets) {
      css += sheet.textContent + '\n';
    }

    if (!css.includes('@import')) {
      css = `@import "tailwindcss";${css}`;
    }

    if (this.lastCss === css) return;

    this.lastCss = css;

    try {
      this.compiler = await tailwindcss.compile(css, {
        base: '/',
        loadStylesheet: this.loadStylesheet,
        loadModule: this.loadModule
      });
    } finally {
      this.classes.clear();
    }
  }

  private async build(kind: 'full' | 'incremental'): Promise<string | undefined> {
    if (!this.compiler) return;

    const newClasses = new Set<string>();

    for (const element of this.env.querySelectorAll('[class]')) {
      for (const c of element.classList) {
        if (this.classes.has(c)) continue;

        this.classes.add(c);
        newClasses.add(c);
      }
    }

    if (newClasses.size === 0 && kind === 'incremental') return;

    return this.compiler.build(Array.from(newClasses));
  }

  private async loadStylesheet(id: string, base: string) {
    const stylesheetMap: Record<string, { path: string; content: string }> = {
      tailwindcss: { path: 'virtual:tailwindcss/index.css', content: assets.css.index },
      'tailwindcss/preflight': { path: 'virtual:tailwindcss/preflight.css', content: assets.css.preflight },
      'tailwindcss/preflight.css': { path: 'virtual:tailwindcss/preflight.css', content: assets.css.preflight },
      './preflight.css': { path: 'virtual:tailwindcss/preflight.css', content: assets.css.preflight },
      'tailwindcss/theme': { path: 'virtual:tailwindcss/theme.css', content: assets.css.theme },
      'tailwindcss/theme.css': { path: 'virtual:tailwindcss/theme.css', content: assets.css.theme },
      './theme.css': { path: 'virtual:tailwindcss/theme.css', content: assets.css.theme },
      'tailwindcss/utilities': { path: 'virtual:tailwindcss/utilities.css', content: assets.css.utilities },
      'tailwindcss/utilities.css': { path: 'virtual:tailwindcss/utilities.css', content: assets.css.utilities },
      './utilities.css': { path: 'virtual:tailwindcss/utilities.css', content: assets.css.utilities }
    };

    const stylesheet = stylesheetMap[id];
    if (stylesheet) {
      return { ...stylesheet, base };
    }

    throw new Error(`The browser build does not support @import for "${id}"`);
  }

  private async loadModule(): Promise<never> {
    throw new Error(`The browser build does not support plugins or config files.`);
  }
}

export function useTailwindCSS() {
  const jitRef = useRef<TailwindCSSJit>(null);
  const sheetRef = useRef<HTMLStyleElement>(null);
  const styleObserverRef = useRef<MutationObserver>(null);
  const observerRef = useRef<MutationObserver>(null);

  const observeStyle = (style: HTMLStyleElement) => {
    styleObserverRef.current?.observe(style, {
      attributes: true,
      attributeFilter: ['type'],
      characterData: true,
      subtree: true,
      childList: true
    });
  };

  const rebuild = async (kind: 'full' | 'incremental') => {
    const css = await jitRef.current?.rebuild(kind);

    if (css !== undefined && sheetRef.current) {
      sheetRef.current.textContent = css;
    }
  };

  const mount = (doc: Document) => {
    jitRef.current ??= new TailwindCSSJit(doc);
    sheetRef.current ??= doc.createElement('style');

    styleObserverRef.current = new MutationObserver(() => rebuild('full'));
    observerRef.current = new MutationObserver(records => {
      let full = 0;
      let incremental = 0;

      for (const record of records) {
        for (const node of record.addedNodes as Iterable<HTMLElement>) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName !== 'STYLE') continue;
          if (node.getAttribute('type') !== TailwindCSSJit.STYLE_TYPE) continue;

          observeStyle(node as HTMLStyleElement);
          full++;
        }

        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node === sheetRef.current) continue;
          incremental++;
        }

        if (record.type === 'attributes') {
          incremental++;
        }
      }

      if (full > 0) {
        rebuild('full');
      } else if (incremental > 0) {
        rebuild('incremental');
      }
    });

    for (const style of jitRef.current.stylesheets) {
      observeStyle(style);
    }
    observerRef.current.observe(doc, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });

    rebuild('full');
    doc.head.appendChild(sheetRef.current);
  };

  const unmount = () => {
    styleObserverRef.current?.disconnect();
    observerRef.current?.disconnect();
    sheetRef.current?.remove();
    styleObserverRef.current = null;
    observerRef.current = null;
    sheetRef.current = null;
    jitRef.current = null;
  };

  return { mount, unmount };
}
