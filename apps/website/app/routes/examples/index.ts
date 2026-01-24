import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { Route } from './+types/index';

async function readDirRecursive(dir: string, baseDir: string, result: Record<string, string>) {
  const entries = await readdir(dir, { withFileTypes: true });

  await Promise.all(
    entries.map(async entry => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await readDirRecursive(fullPath, baseDir, result);
      } else {
        const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
        const content = await readFile(fullPath, 'utf-8');
        result[`./${relativePath}`] = content;
      }
    })
  );
}

interface ExampleMeta {
  embedded?: boolean;
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

export async function loader({ params }: Route.LoaderArgs) {
  const examplePath = params['*'];

  if (!examplePath) {
    const entries = await readdir(import.meta.dirname, { withFileTypes: true });
    const dirs = entries.filter(entry => entry.isDirectory());

    const list = await Promise.all(
      dirs.map(async entry => {
        const meta = await getExampleMeta(join(import.meta.dirname, entry.name));

        return { name: entry.name, ...meta };
      })
    );

    return Response.json(list);
  }

  const examplesDir = join(import.meta.dirname, examplePath);

  try {
    const result: Record<string, string> = {};
    await readDirRecursive(examplesDir, examplesDir, result);
    delete result['./meta.json'];
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Example not found' }, { status: 404 });
  }
}
