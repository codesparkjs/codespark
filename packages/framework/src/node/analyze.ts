import { Analyzer } from '../analyzer';
import { type Loader, LoaderType } from '../loaders';

const EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs'] as const;

export class NodeAnalyzer extends Analyzer {
  private visited = new Set<string>();

  constructor(
    private files: Record<string, string>,
    loaders: Loader<any>[]
  ) {
    super(loaders);
  }

  analyze() {
    for (const path of Object.keys(this.files)) {
      if (path.endsWith('.html')) {
        this.getOutputArray(LoaderType.Asset).push({ path, content: this.files[path] });
      } else {
        const loader = this.matchLoader(path);
        if (loader) {
          this.processFile(path);
        }
      }
    }
  }

  private processFile(path: string) {
    if (this.visited.has(path)) return;
    this.visited.add(path);

    const source = this.files[path];
    if (source === undefined) return;

    const loader = this.matchLoader(path);
    if (!loader) return;

    const output = loader.transform(source, {
      resourcePath: path,
      getSource: p => this.files[p],
      resolve: src => this.resolve(src, path)
    });

    switch (output.type) {
      case LoaderType.ESModule: {
        const { content, dependencies, externals } = output;
        // Process internal dependencies first
        for (const depPath of Object.values(dependencies)) {
          this.processFile(depPath);
        }
        this.getOutputArray(LoaderType.ESModule).push({ path, content, dependencies, externals, raw: source });
        break;
      }
      case LoaderType.Style: {
        const { content, imports, attributes } = output;
        this.getOutputArray(LoaderType.Style).push({ path, content, imports, attributes });
        for (const depPath of imports) {
          this.processFile(depPath);
        }
        break;
      }
    }

    if (output.type === LoaderType.ESModule) {
      const { content, dependencies, externals } = output;
      for (const depPath of Object.values(dependencies)) {
        this.processFile(depPath);
      }
      this.getOutputArray(LoaderType.ESModule).push({ path, content, dependencies, externals, raw: source });
    }
  }

  private resolve(source: string, from: string) {
    if (!source.startsWith('.') && !source.startsWith('/')) {
      return null;
    }

    const fromDir = from.split('/').slice(0, -1);
    for (const part of source.split('/')) {
      if (part === '..') fromDir.pop();
      else if (part !== '.') fromDir.push(part);
    }
    const resolved = fromDir.join('/') || '.';

    if (this.files[resolved] !== undefined) return resolved;

    for (const ext of EXTENSIONS) {
      if (this.files[resolved + ext] !== undefined) return resolved + ext;
    }

    for (const ext of EXTENSIONS) {
      const indexPath = `${resolved}/index${ext}`;
      if (this.files[indexPath] !== undefined) return indexPath;
    }

    return null;
  }
}
