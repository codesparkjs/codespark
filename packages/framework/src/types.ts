import type { Dep } from '_shared/types';

export interface FrameworkCompiler {
  compile(source: string, deps?: Dep[]): string;
  revokeBlobUrls(): void;
}

export interface FrameworkConfig {
  name: string;
  compiler: FrameworkCompiler | (() => FrameworkCompiler);
  imports?: Record<string, string>;
  srcdoc?: string;
  presets?: string[];
}
