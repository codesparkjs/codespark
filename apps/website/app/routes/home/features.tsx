import { CodesparkEditor, CodesparkPreview, CodesparkProvider, createWorkspace, Style, type Workspace } from '@codespark/react';
import { Database, Heart, Palette, Sparkles, Star, Zap } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type ReactNode, useState } from 'react';

import { cn } from '~/lib/utils';

const LivePreviewWorkspace = createWorkspace(() => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <p className="text-2xl font-bold">{count}</p>
      <button onClick={() => setCount(count + 1)} className="rounded-lg bg-black px-4 py-2 text-white">
        Click me
      </button>
    </div>
  );
});

const AutoDepsWorkspace = createWorkspace(() => {
  const icons = [Heart, Star, Sparkles];

  return (
    <div className="flex items-center justify-center gap-6 p-6">
      {icons.map((Icon, i) => (
        <Icon key={i} className="h-8 w-8" />
      ))}
    </div>
  );
});

const TailwindWorkspace = createWorkspace(() => {
  const [state, setState] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setState({
      x: (py - 0.5) * 20,
      y: -(px - 0.5) * 20,
      glareX: px * 100,
      glareY: py * 100
    });
  };

  return (
    <div className="flex items-center justify-center p-6" style={{ perspective: '800px' }}>
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setState(s => ({ ...s, x: 0, y: 0 }))}
        style={{ transform: `rotateX(${state.x}deg) rotateY(${state.y}deg)` }}
        className="relative overflow-hidden rounded-xl bg-linear-to-br from-slate-800 to-slate-900 p-8 shadow-2xl transition-transform duration-200 ease-out">
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${state.glareX}% ${state.glareY}%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
            opacity: state.x || state.y ? 1 : 0
          }}
        />
        <p className="relative text-sm font-medium text-white/80">Hover me</p>
        <p className="relative text-xl font-bold text-white">3D Card</p>
      </div>
    </div>
  );
});

const CUSTOM_STYLES = `
body {
  background: transparent;
}
`;

function DemoPark({ workspace, title, description, icon, reverse }: { workspace: Workspace; title: string; description: string; icon: ReactNode; reverse?: boolean }) {
  const { theme } = useTheme();

  return (
    <CodesparkProvider workspace={workspace} theme={theme as 'light' | 'dark'}>
      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className={cn('border-border bg-card overflow-hidden rounded-lg border lg:col-span-2', reverse ? 'lg:order-2 lg:-mx-px' : 'lg:-mx-px')}>
          <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <CodesparkEditor height={360} toolbox={false} options={{ fixedOverflowWidgets: true }} />
        </div>
        <div
          className={cn(
            'relative border-(--pattern-fg) bg-[repeating-linear-gradient(315deg,var(--pattern-fg)_0,var(--pattern-fg)_1px,transparent_0,transparent_50%)] bg-size-[10px_10px] bg-fixed [--pattern-fg:var(--color-black)]/5 max-lg:h-64 max-lg:border-t dark:[--pattern-fg:var(--color-white)]/10',
            reverse ? 'lg:order-1' : ''
          )}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            <CodesparkPreview className="overflow-hidden rounded-lg">
              <Style>{CUSTOM_STYLES}</Style>
            </CodesparkPreview>
            <div className="bg-card/70 flex items-center gap-3 rounded-lg border px-4 py-3">
              <div className="bg-muted text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">{icon}</div>
              <div>
                <h3 className="text-foreground text-sm font-semibold">{title}</h3>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CodesparkProvider>
  );
}

export function Features() {
  return (
    <div className="flex flex-col gap-16">
      <DemoPark workspace={LivePreviewWorkspace} title="Live Preview" description="Changes reflect instantly without refresh" icon={<Zap className="h-5 w-5" />} reverse />
      <DemoPark workspace={AutoDepsWorkspace} title="Auto Dependencies" description="Automatically resolve npm packages" icon={<Database className="h-5 w-5" />} />
      <DemoPark workspace={TailwindWorkspace} title="Tailwind CSS" description="Full Tailwind v4 support with live styling" icon={<Palette className="h-5 w-5" />} reverse />
    </div>
  );
}
