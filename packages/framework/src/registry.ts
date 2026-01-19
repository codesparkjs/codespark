import type { FrameworkCompiler, FrameworkConfig } from './types';

class FrameworkRegistry {
  private frameworks = new Map<string, FrameworkConfig>();

  register(config: FrameworkConfig): void {
    this.frameworks.set(config.name, config);
  }

  get(name: string): FrameworkConfig | undefined {
    return this.frameworks.get(name);
  }

  getCompiler(name: string): FrameworkCompiler {
    const config = this.frameworks.get(name);
    if (!config) {
      throw new Error(`Framework "${name}" not registered`);
    }
    return typeof config.compiler === 'function' ? config.compiler() : config.compiler;
  }

  list(): string[] {
    return Array.from(this.frameworks.keys());
  }
}

export const frameworkRegistry = new FrameworkRegistry();

export function registerFramework(config: FrameworkConfig): void {
  frameworkRegistry.register(config);
}
