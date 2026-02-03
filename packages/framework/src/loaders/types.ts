export enum LoaderType {
  ESModule = 'esmodule',
  Style = 'style',
  Script = 'script',
  Asset = 'asset'
}

interface BaseLoaderOutput<T extends LoaderType> {
  type: T;
  content: string;
}

export interface ESModuleLoaderOutput extends BaseLoaderOutput<LoaderType.ESModule> {
  dependencies: Record<string, string>;
  externals: { name: string; imported: string[] }[];
}

export interface StyleLoaderOutput extends BaseLoaderOutput<LoaderType.Style> {
  imports: string[];
  href?: string;
  attributes?: Record<string, string>;
}

export interface ScriptLoaderOutput extends BaseLoaderOutput<LoaderType.Script> {
  src?: string;
  attributes?: Record<string, string>;
}

export type AssetLoaderOutput = BaseLoaderOutput<LoaderType.Asset>;

export type LoaderOutput<T extends LoaderType> = Extract<ESModuleLoaderOutput | StyleLoaderOutput | ScriptLoaderOutput | AssetLoaderOutput, { type: T }>;

export interface LoaderContext {
  resourcePath: string;
  getSource: (path: string) => string | undefined;
  resolve: (source: string) => string | null;
}

export interface Loader<T extends LoaderType> {
  readonly name: string;
  readonly test: RegExp;
  transform(source: string, ctx?: LoaderContext): LoaderOutput<T>;
}
