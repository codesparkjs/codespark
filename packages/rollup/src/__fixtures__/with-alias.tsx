import type { CollectResult } from '_shared/types';

export const App = (result: CollectResult) => <div>{result.entry.code}</div>;
