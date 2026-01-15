import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { Icons } from '~/components/icons';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-1 font-semibold">
          <Icons.logo className="size-6" />
          codespark
        </div>
      )
    },
    githubUrl: 'https://github.com/codesparkjs/codespark',
    links: [
      {
        text: 'Docs',
        url: '/docs'
      },
      {
        text: 'Packages',
        url: '/packages'
      },
      {
        text: 'Showcase',
        url: '/showcase'
      },
      {
        text: 'Playground',
        url: '/playground',
        external: true
      }
    ]
  };
}
