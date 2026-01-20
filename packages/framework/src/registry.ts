import type { Dep } from '_shared/types';

export abstract class Framework {
  abstract readonly name: string;
  abstract readonly imports: Record<string, string>;

  abstract analyze(entry: string, files: Record<string, string>): Dep[];
  abstract compile(entry: string, files: Record<string, string>): string;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  revoke(): void {}
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
