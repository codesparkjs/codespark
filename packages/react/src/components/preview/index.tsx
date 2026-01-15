import { type ReactNode, useEffect } from 'react';

import { useInjections } from '@/components/inject';
import { type ConfigProviderProps, useCodespark, useConfig } from '@/context';
import { cn } from '@/lib/utils';
import { useWorkspace, Workspace, type WorkspaceInit } from '@/lib/workspace';

import { usePreview } from './use-preview';
import { useTailwindCss } from './use-tailwindcss';

export interface CodesparkPreviewProps extends ConfigProviderProps, Pick<WorkspaceInit, 'template'> {
  code?: string;
  workspace?: Workspace;
  className?: string;
  tailwindcss?: boolean;
  children?: ReactNode;
  onError?: (error: unknown) => void;
  onLoad?: (iframe: HTMLIFrameElement) => void;
  onRendered?: () => void;
}

export function CodesparkPreview(props: CodesparkPreviewProps) {
  const { imports: globalImports, theme: globalTheme } = useConfig();
  const { workspace: contextWorkspace, imports: contextImports, theme: contextTheme, template: contextTemplate } = useCodespark();
  const {
    code = '',
    template = contextTemplate,
    workspace = contextWorkspace ?? new Workspace({ entry: 'App.tsx', files: { 'App.tsx': code }, template }),
    className,
    tailwindcss = true,
    imports,
    theme = contextTheme ?? globalTheme ?? 'light',
    children,
    onError,
    onLoad,
    onRendered
  } = props;
  const { entryFile, compiled, imports: workspaceImports } = useWorkspace(workspace);
  const { mount: mountTailwind, unmount: unmountTailwind } = useTailwindCss();
  const injections = useInjections(children);
  const { iframeRef, readyRef, preview, running } = usePreview({
    theme,
    presets: injections,
    imports: {
      ...workspaceImports,
      ...globalImports,
      ...contextImports,
      ...imports
    },
    onError,
    onLoad: proxy => {
      onLoad?.(proxy.iframe);
    },
    onRenderComplete: onRendered
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
    if (typeof window === 'undefined' || !code || !!workspace) return;

    preview(code);
  }, [code]);

  useEffect(() => {
    if (typeof window === 'undefined' || !compiled || !workspace) return;

    preview(compiled);
  }, [entryFile, compiled]);

  return (
    <div className={cn('relative flex h-50 items-center justify-center', className)}>
      {running ? (
        <div className="absolute right-2 bottom-2 z-10 h-8 w-8 **:box-border">
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
        </div>
      ) : null}
      <iframe ref={iframeRef} className="h-full w-full" />
    </div>
  );
}
