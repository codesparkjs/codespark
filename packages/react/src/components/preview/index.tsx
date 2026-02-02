import { type ReactNode, useEffect } from 'react';

import { useInjections } from '@/components/inject';
import { type ConfigContextValue, useCodespark, useConfig } from '@/context';
import { usePreview } from '@/lib/preview-proxy';
import { useTailwindCSS } from '@/lib/tailwindcss';
import { cn } from '@/lib/utils';
import { useWorkspace, Workspace, type WorkspaceInit } from '@/lib/workspace';

export interface CodesparkPreviewProps extends ConfigContextValue, Pick<WorkspaceInit, 'framework'> {
  code?: string;
  workspace?: Workspace;
  className?: string;
  tailwindcss?: boolean;
  children?: ReactNode;
  height?: number;
  onError?: (error: unknown) => void;
  onLoad?: (iframe: HTMLIFrameElement) => void;
  onRendered?: () => void;
  onConsole?: (data: { level: string; args: unknown[]; duplicate?: boolean }) => void;
}

export function CodesparkPreview(props: CodesparkPreviewProps) {
  const { imports: globalImports, theme: globalTheme } = useConfig();
  const { workspace: contextWorkspace, imports: contextImports, theme: contextTheme, framework: contextFramework } = useCodespark() || {};
  const { code = '', framework = contextFramework, className, tailwindcss = true, imports, theme = contextTheme ?? globalTheme ?? 'light', children, height, onError, onLoad, onRendered, onConsole } = props;
  const { compiled, vendor, workspace } = useWorkspace(props.workspace ?? contextWorkspace ?? new Workspace({ entry: './App.tsx', files: { './App.tsx': code }, framework }));
  const { mount: mountTailwind, unmount: unmountTailwind } = useTailwindCSS();
  const injections = useInjections(children);
  const { iframeRef, readyRef, preview, running } = usePreview({
    theme,
    presets: [...injections, ...vendor.styles.map(({ path, content }) => (path.endsWith('.tw.css') ? `<style type="text/tailwindcss">${content}</style>` : `<style>${content}</style>`))],
    imports: {
      ...vendor.imports,
      ...globalImports,
      ...contextImports,
      ...imports
    },
    onError,
    onLoad: proxy => {
      onLoad?.(proxy.iframe);
    },
    onRenderComplete: onRendered,
    onConsole
  });

  useEffect(() => {
    if (!tailwindcss) {
      unmountTailwind();
    } else {
      readyRef.current.promise.then(doc => {
        if (doc) mountTailwind(doc);
      });
    }

    return unmountTailwind;
  }, [tailwindcss]);

  useEffect(() => {
    if (typeof window === 'undefined' || !code) return;

    workspace.setFile(workspace.entry, code);
  }, [code]);

  useEffect(() => {
    if (typeof window === 'undefined' || !compiled) return;

    preview(compiled);
  }, [compiled]);

  return (
    <div className={cn('relative flex h-50 items-center justify-center', className)} style={{ height }}>
      {running ? (
        <div className="absolute right-2 bottom-2 z-10 h-8 w-8 **:box-border">
          <div className="flex -translate-x-1 translate-y-[9px] scale-[0.13] **:absolute **:h-24 **:w-24">
            <div className="fill-mode-forwards **:border-foreground **:bg-background transform-[rotateX(-25.5deg)_rotateY(45deg)] animate-[cube-rotate_1s_linear_infinite] transform-3d **:rounded-lg **:border-10">
              <div className="origin-[50%_50%] transform-[rotateX(90deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateY(90deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateX(-90deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateY(-90deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateY(0deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateY(-180deg)_translateZ(44px)]" />
            </div>
          </div>
        </div>
      ) : null}
      <iframe ref={iframeRef} className="h-full w-full" />
    </div>
  );
}
