import { type ReactNode, useEffect } from 'react';

import { cn } from '@/lib/utils';
import { useWorkspace, Workspace, type WorkspaceInit } from '@/lib/workspace';

import { type ConfigProviderProps, useCodespark, useConfig } from '../context';
import { useInjections } from '../inject';
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
  const { entryFile, deps, compiled, compileError, imports: workspaceImports } = useWorkspace(workspace);
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
  }, [entryFile, deps, compiled]);

  useEffect(() => {
    onError?.(compileError);
  }, [compileError]);

  return (
    <div className={cn('h-50 relative flex items-center justify-center', className)}>
      {running ? (
        <div className="**:box-border absolute bottom-2 right-2 z-10 h-8 w-8">
          <div className="**:box-border absolute bottom-2 right-2 z-10 h-8 w-8">
            <div className="**:absolute **:h-24 **:w-24 flex -translate-x-1 translate-y-[9px] scale-[0.13]">
              <div className="fill-mode-forwards transform-3d transform-[rotateX(-25.5deg)_rotateY(45deg)] **:rounded-lg **:border-10 **:border-foreground **:bg-background animate-[cube-rotate_1s_linear_infinite]">
                <div className="transform-[rotateX(90deg)_translateZ(44px)] origin-[50%_50%]" />
                <div className="transform-[rotateY(90deg)_translateZ(44px)] origin-[50%_50%]" />
                <div className="transform-[rotateX(-90deg)_translateZ(44px)] origin-[50%_50%]" />
                <div className="transform-[rotateY(-90deg)_translateZ(44px)] origin-[50%_50%]" />
                <div className="transform-[rotateY(0deg)_translateZ(44px)] origin-[50%_50%]" />
                <div className="transform-[rotateY(-180deg)_translateZ(44px)] origin-[50%_50%]" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <iframe ref={iframeRef} className="h-full w-full" />
    </div>
  );
}
