import MagicString from 'magic-string';

export class RuntimeBuilder {
  private s: MagicString;
  root = `document.getElementById('root')`;

  constructor(code: string | MagicString = '') {
    this.s = typeof code === 'string' ? new MagicString(code) : code;
  }

  toString() {
    return this.s.toString();
  }

  update(start: number, end: number, content: string) {
    this.s.update(start, end, content);
    return this;
  }

  remove(start: number, end: number) {
    this.s.remove(start, end);
    return this;
  }

  setHTML(content: string, options?: { target?: 'root' | 'body'; activateScripts?: boolean }) {
    const container = options?.target === 'body' ? 'document.body' : `document.getElementById('root')`;
    this.s.append(`${container}.innerHTML = ${content};`);

    if (options?.activateScripts) {
      this.s.append(`
${container}.querySelectorAll('script').forEach(old => {
  const el = document.createElement('script');
  [...old.attributes].forEach(a => el.setAttribute(a.name, a.value));
  el.textContent = old.textContent;
  old.replaceWith(el);
});`);
    }
    return this;
  }

  append(code: string) {
    this.s.append(code);
    return this;
  }

  prepend(code: string) {
    this.s.prepend(code);
    return this;
  }

  done() {
    this.s.append('window.__render_complete__?.();\nwindow.__next__?.();');
    return this.s.toString();
  }

  async(code: string) {
    this.s.append(`
;(async () => {
  try {
    ${code}
    window.__render_complete__?.();
  } finally {
    window.__next__?.();
  }
})();`);

    return this;
  }
}
