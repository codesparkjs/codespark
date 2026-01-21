import { useEffect, useRef, useState } from 'react';

import { PreviewProxy } from '@/lib/preview-proxy';

export interface UsePreviewOptions {
  presets?: string[];
  imports?: Record<string, string>;
  theme?: 'light' | 'dark';
  onLoad?: (proxy: PreviewProxy) => void;
  onError?: (error: unknown) => void;
  onFetchProgress?: (event: { loading?: string; loaded?: string; remaining: string[] }) => void;
  onRenderComplete?: () => void;
  onConsole?: (data: { level: string; args: unknown[] }) => void;
}

export function usePreview(options?: UsePreviewOptions) {
  const { presets, imports, theme = 'light', onLoad, onError, onFetchProgress, onRenderComplete, onConsole } = options || {};
  const [running, setRunning] = useState(true);
  const proxyRef = useRef<PreviewProxy>(void 0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(Promise.withResolvers<Document | null | undefined>());

  const preview = async (...code: string[]) => {
    try {
      setRunning(true);
      await readyRef.current.promise;
      await proxyRef.current?.eval(code);
    } catch (error) {
      onError?.(error);
    }
  };

  useEffect(() => {
    if (iframeRef.current) {
      const proxy = new PreviewProxy({
        root: iframeRef.current,
        defaultTheme: theme,
        handlers: {
          on_console: onConsole,
          on_fetch_progress: onFetchProgress,
          on_render_complete: () => {
            onRenderComplete?.();
            setRunning(false);
          },
          on_error: event => {
            onError?.(event.value instanceof Error ? event.value : new Error(event.value));
          },
          on_unhandled_rejection: event => {
            onError?.(new Error(`Uncaught (in promise): ${event.value}`));
          }
        }
      });
      iframeRef.current.addEventListener('load', e => {
        readyRef.current.resolve((e.target as HTMLIFrameElement).contentDocument);
        onLoad?.(proxy);
      });
      proxyRef.current = proxy;

      return () => proxy.destroy();
    }
  }, []);

  useEffect(() => {
    readyRef.current.promise.then(() => {
      proxyRef.current?.changeTheme(theme);
    });
  }, [theme]);

  useEffect(() => {
    readyRef.current.promise.then(() => {
      proxyRef.current?.injectTags(presets);
    });
  }, [presets?.join('\n')]);

  useEffect(() => {
    readyRef.current.promise.then(() => {
      proxyRef.current?.setImportMap(imports);
    });
  }, [JSON.stringify(imports)]);

  return { iframeRef, proxyRef, readyRef, preview, running };
}
