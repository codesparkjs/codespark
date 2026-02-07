import type { Route } from './+types/index';

type FileMap = Record<string, string>;

interface ExampleMeta {
  title?: string;
}

const metaFiles = import.meta.glob<ExampleMeta>('./**/meta.json', { eager: true, import: 'default' });
const embeddedFiles = import.meta.glob<string>('./**/embedded/**/*', { eager: true, query: '?raw', import: 'default' });
const rawFiles = import.meta.glob<string>('./**/raw/**/*', { eager: true, query: '?raw', import: 'default' });

function getExampleNames(): string[] {
  const names = new Set<string>();
  for (const path of Object.keys(metaFiles)) {
    const match = path.match(/^\.\/([^/]+)\/meta\.json$/);
    if (match) {
      names.add(match[1]);
    }
  }
  return Array.from(names);
}

function getExampleMeta(name: string): ExampleMeta {
  return metaFiles[`./${name}/meta.json`] || {};
}

function getEmbeddedFiles(name: string): FileMap | null {
  const prefix = `./${name}/embedded/`;
  const files: FileMap = {};
  let hasFiles = false;

  for (const [path, content] of Object.entries(embeddedFiles)) {
    if (path.startsWith(prefix)) {
      const relativePath = path.slice(prefix.length);
      files[`./${relativePath}`] = content;
      hasFiles = true;
    }
  }

  return hasFiles ? files : null;
}

function getRawFiles(name: string): FileMap | null {
  const prefix = `./${name}/raw/`;
  const files: FileMap = {};
  let hasFiles = false;

  for (const [path, content] of Object.entries(rawFiles)) {
    if (path.startsWith(prefix)) {
      const relativePath = path.slice(prefix.length);
      files[`./${relativePath}`] = content;
      hasFiles = true;
    }
  }

  return hasFiles ? files : null;
}

export async function loader({ params }: Route.LoaderArgs): Promise<Response> {
  const examplePath = params['*'];

  if (!examplePath) {
    const names = getExampleNames();
    const list = names.map(name => {
      const meta = getExampleMeta(name);
      const raw = getRawFiles(name);
      return { name, raw: raw !== null, ...meta };
    });

    return Response.json(list);
  }

  const embedded = getEmbeddedFiles(examplePath);
  const raw = getRawFiles(examplePath);

  if (!embedded) {
    return Response.json({ error: 'Example not found' }, { status: 404 });
  }

  if (raw) {
    return Response.json({ embedded, raw });
  }

  return Response.json({ embedded });
}
