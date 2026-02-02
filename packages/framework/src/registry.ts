import MagicString from 'magic-string';

import { type LoaderOutput, LoaderType } from './loaders/types';

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

  remove(start: number, end: number) {
    this.s.remove(start, end);
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

export type Output<T extends LoaderType = LoaderType> = Omit<LoaderOutput<T>, 'type'> & {
  path: string;
};

export type Outputs = Map<LoaderType, Output[]>;

export abstract class Framework {
  abstract readonly name: string;
  abstract readonly imports: Record<string, string>;
  abstract outputs: Outputs;

  abstract analyze(entry: string, files: Record<string, string>): void;
  abstract compile(): string;

  protected createBuilder(init?: string) {
    return new RuntimeBuilder(init);
  }

  getOutput<T extends LoaderType>(type: T) {
    return (this.outputs.get(type) ?? []) as Output<T>[];
  }
}

class FrameworkRegistry {
  private frameworks = new Map<string, Framework>();

  register(framework: Framework, name?: string): void {
    this.frameworks.set(name ?? framework.name, framework);
  }

  get(name: string): Framework | undefined {
    return this.frameworks.get(name);
  }

  list(): string[] {
    return Array.from(this.frameworks.keys());
  }
}

export const registry = new FrameworkRegistry();

export function registerFramework(framework: Framework, name?: string): void {
  registry.register(framework, name);
}
