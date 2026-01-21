import type { Dep } from '_shared/types';
import MagicString from 'magic-string';

class RuntimeBuilder {
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

  setHTML(content: string) {
    this.s.append(`document.getElementById('root').innerHTML = ${content};`);
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
    this.s.append(`
        window.__render_complete__?.();
        window.__next__?.();
      `);
    return this.s.toString();
  }

  async(code: string) {
    this.s.append(`(async () => {\ntry {\n${code}\nwindow.__render_complete__?.();\n} finally {\nwindow.__next__?.();\n}\n})();`);
    return this;
  }
}

export abstract class Framework {
  abstract readonly name: string;
  abstract readonly imports: Record<string, string>;

  abstract analyze(entry: string, files: Record<string, string>): Dep[];
  abstract compile(entry: string, files: Record<string, string>): string;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  revoke(): void {}

  protected createBuilder(init?: string) {
    return new RuntimeBuilder(init);
  }
}

class FrameworkRegistry {
  private frameworks = new Map<string, Framework>();

  register(framework: Framework): void {
    this.frameworks.set(framework.name, framework);
  }

  get(name: string): Framework | undefined {
    return this.frameworks.get(name);
  }

  list(): string[] {
    return Array.from(this.frameworks.keys());
  }
}

export const registry = new FrameworkRegistry();

export function registerFramework(framework: Framework): void {
  registry.register(framework);
}
