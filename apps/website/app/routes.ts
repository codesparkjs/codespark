import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  layout('layouts/with-nav.tsx', [index('routes/home/page.tsx'), route('docs/*', 'routes/docs/page.tsx'), route('showcase', 'routes/showcase/page.tsx')]),
  route('playground', 'routes/playground/page.tsx'),
  route('playground/dev-proxy/*', 'routes/playground/dev-proxy.ts'),
  route('examples/*', 'routes/examples/index.ts'),
  route('llms.mdx/docs/*', 'routes/llms-mdx.ts'),
  route('llms-full.txt', 'routes/llms-full.ts'),
  route('api/search', 'routes/docs/search.ts')
] satisfies RouteConfig;
