import { createContext, type ReactNode, useContext } from 'react';

import type { CodeMirror } from '@/components/editor/codemirror';
import type { Monaco } from '@/components/editor/monaco';
import { type FileTreeNode, useWorkspace, Workspace, type WorkspaceDerivedState, type WorkspaceInit } from '@/lib/workspace';

export interface ConfigContextValue {
  theme?: 'light' | 'dark';
  imports?: Record<string, string>;
  editor?: typeof CodeMirror | typeof Monaco;
}

export interface CodesparkContextValue extends ConfigContextValue, WorkspaceDerivedState, Pick<WorkspaceInit, 'framework'> {
  workspace?: Workspace;
  files: Record<string, string>;
  currentFile: FileTreeNode;
}

const ConfigContext = createContext<ConfigContextValue>({ theme: 'light' });

const CodesparkContext = createContext<CodesparkContextValue | null>(null);

export const useConfig = () => useContext(ConfigContext);

export const useCodespark = () => useContext(CodesparkContext);

export interface ConfigProviderProps extends ConfigContextValue {
  children?: ReactNode;
}

export function ConfigProvider(props: ConfigProviderProps) {
  const { children, ...config } = props;

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export interface CodesparkProviderProps extends Omit<CodesparkContextValue, 'files' | 'currentFile' | keyof WorkspaceDerivedState> {
  children?: ReactNode;
}

export function CodesparkProvider(props: CodesparkProviderProps) {
  const { children, theme, framework = 'react', imports, editor, workspace = new Workspace({ entry: './App.tsx', files: { './App.tsx': '' }, framework }) } = props;
  const store = useWorkspace(workspace);

  return <CodesparkContext.Provider value={{ framework, imports, theme, editor, ...store }}>{children}</CodesparkContext.Provider>;
}
