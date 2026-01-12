import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-1 font-semibold">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
