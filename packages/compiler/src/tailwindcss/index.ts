import * as tailwindcss from 'tailwindcss';

import * as assets from './assets';

export class TailwindCssCompiler {
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
    return this.env.querySelectorAll(`style[type="${TailwindCssCompiler.STYLE_TYPE}"]`);
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
