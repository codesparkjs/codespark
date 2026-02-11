import type { ESModuleLoaderOutput, Loader } from './types';
import { LoaderType } from './types';

export class JSONLoader implements Loader<LoaderType.ESModule> {
  readonly name = 'json-loader';
  readonly test = /\.json$/;

  transform(source: string): ESModuleLoaderOutput {
    return { type: LoaderType.ESModule, content: `export default ${source};`, dependencies: {}, externals: [], raw: source };
  }
}
