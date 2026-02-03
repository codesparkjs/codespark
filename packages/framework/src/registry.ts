import { RuntimeBuilder } from './builder';
import { type LoaderOutput, LoaderType } from './loaders/types';

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
