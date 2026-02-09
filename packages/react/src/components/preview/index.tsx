import { type ReactNode, useEffect } from 'react';

import { useInjections } from '@/components/inject';
import { type ConfigContextValue, useCodespark, useConfig } from '@/context';
import { usePreview } from '@/lib/preview-proxy';
import { useTailwindCSS } from '@/lib/tailwindcss';
import { cn, serializeAttributes } from '@/lib/utils';
import { useWorkspace, Workspace, type WorkspaceInit } from '@/lib/workspace';

export interface OnConsoleData {
  /**
   * The console method level (e.g., 'log', 'warn', 'error', 'info', 'debug')
   */
  level: string;
  /**
   * The arguments passed to the console method
   */
  args: unknown[];
  /**
   * Whether this is a duplicate of a previous console call
   */
  duplicate?: boolean;
}

export interface CodesparkPreviewProps extends ConfigContextValue, Pick<WorkspaceInit, 'framework'> {
  /**
   * Source code to preview. Used when not providing a workspace instance
   */
  code?: string;
  /**
   * Workspace instance to use for compilation and file management
   */
  workspace?: Workspace;
  /**
   * CSS class name for the preview container
   */
  className?: string;
  /**
   * Whether to enable Tailwind CSS support in the preview
   *
   * @default true
   */
  tailwindcss?: boolean;
  /**
   * Whether to apply preflight styles (base reset, font smoothing, layout defaults) in the preview iframe
   *
   * @default true
   */
  preflight?: boolean;
  /**
   * Child elements to inject into the preview iframe, such as Script, Style, Link components
   *
   * @example
   * ```tsx
   * <CodesparkPreview>
   *   <Script src="https://example.com/script.js" />
   *   <Style>{`.custom { color: red; }`}</Style>
   * </CodesparkPreview>
   * ```
   */
  children?: ReactNode;
  /**
   * Height of the preview area. Accepts a number (pixels) or CSS string (e.g., '200px', '50%')
   *
   * @default 200
   */
  height?: string | number;
  /**
   * Callback fired when a runtime error occurs in the preview
   */
  onError?: (error: unknown) => void;
  /**
   * Callback fired when the preview iframe is loaded and ready
   */
  onLoad?: (iframe: HTMLIFrameElement) => void;
  /**
   * Callback fired when the preview has finished rendering
   */
  onRendered?: () => void;
  /**
   * Callback fired when console methods are called in the preview.
   * Useful for capturing and displaying console output
   */
  onConsole?: (data: OnConsoleData) => void;
}

const PREFLIGHT_STYLE = `
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html,
body {
  margin: 0;
  overflow: hidden;
}

html {
  width: 100vw;
  height: 100vh;
  padding: 0;
}

body {
  height: 100%;
  padding: 12px;
  overflow: auto;
  box-sizing: border-box;
  display: flex;
}

#root {
  margin: auto;
}
`;

/**
 * CodesparkPreview - A sandboxed preview component that renders compiled code in an iframe.
 *
 * Executes compiled React code in an isolated iframe environment with ES module support.
 * Supports Tailwind CSS, custom scripts/styles injection, and console output capture.
 * Displays a loading indicator during code compilation and execution.
 */
export function CodesparkPreview(props: CodesparkPreviewProps) {
  const { imports: globalImports, theme: globalTheme } = useConfig();
  const { workspace: contextWorkspace, imports: contextImports, theme: contextTheme, framework: contextFramework } = useCodespark() || {};
  const { code = '', framework = contextFramework, className, tailwindcss = true, preflight = true, imports, theme = contextTheme ?? globalTheme ?? 'light', children, height, onError, onLoad, onRendered, onConsole } = props;
  const { compiled, vendor, workspace } = useWorkspace(props.workspace ?? contextWorkspace ?? new Workspace({ entry: './App.tsx', files: { './App.tsx': code }, framework }));
  const { mount: mountTailwind, unmount: unmountTailwind } = useTailwindCSS();
  const injections = useInjections(children);
  const { iframeRef, readyRef, preview, running } = usePreview({
    theme,
    presets: [
      preflight ? `<style>${PREFLIGHT_STYLE}</style>` : '',
      ...injections,
      ...vendor.styles.map(({ content, attributes }) => `<style${serializeAttributes(attributes)}>${content}</style>`),
      ...vendor.scripts.map(({ content, attributes }) => `<script${serializeAttributes(attributes)}>${content}</script>`)
    ].filter(Boolean),
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
    <div className={cn('relative flex h-[200px] items-center justify-center', className)} style={{ height }}>
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
