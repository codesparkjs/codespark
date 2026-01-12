import { useMemo, useState } from 'react';

import { CodesparkProvider, type CodesparkProviderProps, type ConfigProviderProps } from '@/components/context';
import { CodesparkEditor, type CodesparkEditorProps } from '@/components/editor';
import { CodesparkPreview, type CodesparkPreviewProps } from '@/components/preview';
import { cn } from '@/lib/utils';
import { Workspace } from '@/lib/workspace';

export { CodesparkProvider, type CodesparkProviderProps, ConfigProvider, type ConfigProviderProps } from '@/components/context';
export * from '@/components/editor';
export { Script, type ScriptProps, Style, type StyleProps } from '@/components/inject';
export * from '@/components/preview';
export * from '@/lib/workspace';

export interface CodesparkProps extends Pick<ConfigProviderProps, 'theme'>, Pick<CodesparkProviderProps, 'template'>, Pick<CodesparkEditorProps, 'useToolbox'>, Pick<CodesparkPreviewProps, 'tailwindcss'> {
  code: string;
  name?: string;
  showEditor?: boolean;
  showPreview?: boolean;
  readonly?: boolean;
  className?: string;
}

export function Codespark(props: CodesparkProps) {
  const { code, name = 'App.tsx', theme, template, showEditor = true, showPreview = true, readonly: readOnly, className, useToolbox, tailwindcss } = props;
  const workspace = useMemo(() => new Workspace({ entry: name, files: { [name]: code }, template }), []);
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);

  return (
    <CodesparkProvider workspace={workspace} theme={theme}>
      <div className={cn('border-border relative overflow-hidden rounded-lg border', showPreview && showEditor ? 'divide-y' : '', className)}>
        <div className="border-border relative">
          {showPreview ? (
            <CodesparkPreview
              tailwindcss={tailwindcss}
              onError={error => {
                setRuntimeError(error as Error);
              }}
            />
          ) : null}
          {runtimeError ? (
            <div className="bg-background absolute inset-0 z-20 overflow-auto p-6">
              <div className="text-2xl text-red-500">{runtimeError.name}</div>
              <div className="mt-3 font-mono">{runtimeError.stack || runtimeError.message}</div>
            </div>
          ) : null}
        </div>
        {showEditor ? (
          <CodesparkEditor
            options={{ readOnly }}
            useToolbox={useToolbox}
            onChange={() => {
              setRuntimeError(null);
            }}
          />
        ) : null}
      </div>
    </CodesparkProvider>
  );
}

export const useMDXComponents = () => {
  return { Codespark };
};
