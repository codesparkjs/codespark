import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { Route } from './+types/index';

type FileMap = Record<string, string>;

interface ExampleMeta {
  title?: string;
}

async function getExampleMeta(dir: string): Promise<ExampleMeta> {
  try {
    const metaPath = join(dir, 'meta.json');
    const content = await readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function readDirRecursive(dir: string, baseDir: string): Promise<FileMap> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async entry => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        return readDirRecursive(fullPath, baseDir);
      }
      const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
      const content = await readFile(fullPath, 'utf-8');
      return { [`./${relativePath}`]: content };
    })
  );
  return Object.assign({}, ...results);
}

async function readDirSafe(dir: string): Promise<FileMap | null> {
  try {
    return await readDirRecursive(dir, dir);
  } catch {
    return null;
  }
}

export async function loader({ params }: Route.LoaderArgs): Promise<Response> {
  const examplePath = params['*'];

  if (!examplePath) {
    const entries = await readdir(import.meta.dirname, { withFileTypes: true });
    const dirs = entries.filter(entry => entry.isDirectory());

    const list = await Promise.all(
      dirs.map(async entry => {
        const exampleDir = join(import.meta.dirname, entry.name);
        const [meta, raw] = await Promise.all([getExampleMeta(exampleDir), readDirSafe(join(exampleDir, 'raw'))]);
        return { name: entry.name, raw: raw !== null, ...meta };
      })
    );

    return Response.json(list);
  }

  const exampleDir = join(import.meta.dirname, examplePath);
  const [embedded, raw] = await Promise.all([readDirSafe(join(exampleDir, 'embedded')), readDirSafe(join(exampleDir, 'raw'))]);

  if (!embedded) {
    return Response.json({ error: 'Example not found' }, { status: 404 });
  }

  if (raw) {
    return Response.json({ embedded, raw });
  }

  return Response.json({ embedded });
}
