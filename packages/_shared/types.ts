export type Dep = InternalDep | ExternalDep;

export interface InternalDep {
  name: string;
  alias: string;
  code: string;
  dts: string;
  deps: Dep[];
}

export interface ExternalDep {
  name: string;
  version: string;
  imported: string[];
}

export interface CollectResult {
  entry: { code: string; locals: string[]; imports: string[] };
  files: Record<string, string>;
  dts: Record<string, string>;
}
