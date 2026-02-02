interface CollectResult {
  entry: { code: string; locals: string[]; imports: string[] };
  files: Record<string, string>;
}

export const App = (result: CollectResult) => <div>{result.entry.code}</div>;
