import { Framework as Base } from '@codespark/framework';
import { compileSync } from '@mdx-js/mdx';

export class Framework extends Base {
  readonly name = 'markdown';
  readonly imports = {
    react: 'https://esm.sh/react@18.2.0',
    'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime',
    'react-dom/client': 'https://esm.sh/react-dom@18.2.0/client'
  };

  analyze(entry: string, files: Record<string, string>): (InternalDep | ExternalDep)[] {}

  compile(entry: string, files: Record<string, string>): string {
    const source = files[entry];
    const vfile = compileSync(source);
  }
}
