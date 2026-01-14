import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '~/components/ui/button';

import { Features } from './features';

export function meta() {
  return [{ title: 'Spark Code to Your Life - codespark' }, { name: 'description', content: 'Edit and preview React components in real-time' }];
}

export default function Home() {
  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 z-10 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[4rem_4rem]"
        style={{ maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 70%, transparent 100%)' }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/10 absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-primary/5 absolute top-1/4 -right-32 h-80 w-80 rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute bottom-0 left-1/3 h-64 w-64 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 px-6 py-14 *:mx-auto *:max-w-(--fd-layout-width)">
        <section className="flex flex-col items-center text-center">
          <div className="border-border bg-background/80 text-muted-foreground mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Edit. Preview. & Ship.
          </div>
          <h1 className="text-foreground mb-6 text-5xl font-semibold tracking-tight md:text-7xl">
            <span className="bg-linear-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Code</span>
            <span className="relative mx-3 inline-block">
              <span className="absolute -inset-1 animate-pulse rounded-lg bg-emerald-500/20 blur-md" />
              <span className="relative text-4xl text-emerald-400 md:text-6xl">✦</span>
            </span>
            <span className="bg-linear-to-r from-teal-500 to-cyan-400 bg-clip-text text-transparent">Spark</span>
            <br />
            The Park for Your Codes
          </h1>
          <p className="text-muted-foreground mb-8 max-w-2xl text-lg md:text-xl">A code playground sparks your ideas to life with real-time preview, automatic dependency resolution, and instant hot reload</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild>
              <Link to="/docs/getting-started">Get Started</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/docs">
                Learn more
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
        <section className="mt-20">
          <Features />
        </section>
        <section className="border-border text-muted-foreground mt-20 space-x-1 border-t pt-10 text-center text-sm">
          &copy; {new Date().getFullYear()} <span className="text-emerald-400">✦</span> codespark, Inc. All rights reserved.
        </section>
      </div>
    </main>
  );
}
