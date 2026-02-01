import type { ExternalDep } from '_shared/types';

export enum OutputType {
  ESModule = 'esmodule',
  Style = 'style',
  Script = 'script',
  Asset = 'asset'
}

export interface LoaderOutput {
  type: OutputType;
  content: string;
  dependencies: string[];
  externals: ExternalDep[];
}

export interface LoaderContext {
  resourcePath: string;
  getSource: (path: string) => string | undefined;
  resolve: (source: string) => string | null;
}

export interface Loader {
  readonly name: string;
  readonly test: RegExp;
  readonly outputType: OutputType;
  transform(source: string, ctx: LoaderContext): LoaderOutput;
}
