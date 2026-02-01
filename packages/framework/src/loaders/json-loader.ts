import type { Loader, LoaderContext, LoaderOutput } from './types';
import { OutputType } from './types';

export class JSONLoader implements Loader {
  readonly name = 'json-loader';
  readonly test = /\.json$/;
  readonly outputType = OutputType.ESModule;

  transform(source: string, _ctx: LoaderContext): LoaderOutput {
    return {
      type: OutputType.ESModule,
      content: `export default ${source};`,
      dependencies: [],
      externals: []
    };
  }
}
