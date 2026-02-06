import { NavbarMenu, NavbarMenuContent, NavbarMenuLink, NavbarMenuTrigger } from 'fumadocs-ui/layouts/home/navbar';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Boxes, FileCode, Layers } from 'lucide-react';
import { Link } from 'react-router';

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
        type: 'custom',
        on: 'nav',
        children: (
          <NavbarMenu>
            <NavbarMenuTrigger>Packages</NavbarMenuTrigger>
            <NavbarMenuContent className="flex w-[1200px] gap-4 p-4">
              <Link to="/docs/getting-started" className="bg-muted/50 hover:bg-muted group relative flex flex-col justify-end overflow-hidden rounded-lg p-4 transition-colors">
                <div className="from-primary/20 to-primary/5 absolute inset-0 bg-linear-to-br" />
                <Icons.logo className="text-primary mb-3 size-8" />
                <div className="relative">
                  <h3 className="mb-1 font-semibold">Getting Started</h3>
                  <p className="text-muted-foreground text-sm">Build interactive code playgrounds in minutes</p>
                </div>
              </Link>
              <div className="grid flex-1 grid-cols-2 gap-4">
                <NavbarMenuLink href="/docs" className="hover:bg-muted flex h-full flex-col gap-2 rounded-md p-3 transition-colors">
                  <div className="bg-primary/10 flex size-9 items-center justify-center rounded-md">
                    <Icons.react className="text-primary size-5" />
                  </div>
                  <div>
                    <span className="font-medium">@codespark/react</span>
                    <p className="text-muted-foreground mt-1 text-xs">React components for codes park</p>
                  </div>
                </NavbarMenuLink>
                <NavbarMenuLink href="/docs/framework" className="hover:bg-muted flex h-full flex-col gap-2 rounded-md p-3 transition-colors">
                  <div className="bg-primary/10 flex size-9 items-center justify-center rounded-md">
                    <Layers className="text-primary size-5" />
                  </div>
                  <div>
                    <span className="font-medium">@codespark/framework</span>
                    <p className="text-muted-foreground mt-1 text-xs">Framework adapters for compilation</p>
                  </div>
                </NavbarMenuLink>
                <NavbarMenuLink href="/docs/plugin/rollup" className="hover:bg-muted flex h-full flex-col gap-2 rounded-md p-3 transition-colors">
                  <div className="bg-primary/10 flex size-9 items-center justify-center rounded-md">
                    <Boxes className="text-primary size-5" />
                  </div>
                  <div>
                    <span className="font-medium">@codespark/plugin-rollup</span>
                    <p className="text-muted-foreground mt-1 text-xs">Rollup plugin for code transforming</p>
                  </div>
                </NavbarMenuLink>
                <NavbarMenuLink href="/docs/plugin/remark" className="hover:bg-muted flex h-full flex-col gap-2 rounded-md p-3 transition-colors">
                  <div className="bg-primary/10 flex size-9 items-center justify-center rounded-md">
                    <FileCode className="text-primary size-5" />
                  </div>
                  <div>
                    <span className="font-medium">@codespark/plugin-remark</span>
                    <p className="text-muted-foreground mt-1 text-xs">Remark plugin for MDX docs</p>
                  </div>
                </NavbarMenuLink>
              </div>
            </NavbarMenuContent>
          </NavbarMenu>
        )
      },
      // {
      //   text: 'Showcase',
      //   url: '/showcase'
      // },
      {
        text: 'Playground',
        url: '/playground',
        external: true
      }
    ]
  };
}
