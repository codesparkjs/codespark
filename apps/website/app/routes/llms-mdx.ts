import { getLLMText } from '~/lib/get-llm-text';
import { source } from '~/lib/source';

import type { Route } from './+types/llms-mdx';

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter(v => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) {
    return new Response('not found', { status: 404, headers: new Headers() });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'text/markdown');

  return new Response(await getLLMText(page), { headers });
}
