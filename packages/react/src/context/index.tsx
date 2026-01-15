import { createContext, type PropsWithChildren, useContext } from 'react';

import { Workspace, type WorkspaceInit } from '@/lib/workspace';

export interface ConfigProviderProps {
  theme?: 'light' | 'dark';
  imports?: Record<string, string>;
}

export interface CodesparkProviderProps extends ConfigProviderProps, Pick<WorkspaceInit, 'template'> {
  workspace?: Workspace;
}

const ConfigContext = createContext<ConfigProviderProps>({ theme: 'light' });

const CodesparkContext = createContext({} as CodesparkProviderProps);

export const useConfig = () => useContext(ConfigContext);

export const useCodespark = () => useContext(CodesparkContext);

export function ConfigProvider(props: PropsWithChildren<ConfigProviderProps>) {
  const { children, ...config } = props;

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function CodesparkProvider(props: PropsWithChildren<CodesparkProviderProps>) {
  const { children, theme, template = 'react', imports, workspace = new Workspace({ entry: 'App.tsx', files: { 'App.tsx': '' } }) } = props;

  return <CodesparkContext.Provider value={{ workspace, template, imports, theme }}>{children}</CodesparkContext.Provider>;
}
