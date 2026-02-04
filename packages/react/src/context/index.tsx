import { createContext, type ReactNode, useContext } from 'react';

import type { CodeMirror } from '@/components/editor/codemirror';
import type { Monaco } from '@/components/editor/monaco';
import { type FileNode, useWorkspace, Workspace, type WorkspaceDerivedState, type WorkspaceInit } from '@/lib/workspace';

export interface ConfigContextValue {
  /**
   * Theme mode for the editor and preview
   *
   * @default 'light'
   */
  theme?: 'light' | 'dark';
  /**
   * Global import map for external dependencies, where keys are module names and values are CDN URLs
   *
   * @example
   * ```tsx
   * <ConfigProvider imports={{ 'lodash': 'https://esm.sh/lodash' }}>
   *   ...
   * </ConfigProvider>
   * ```
   */
  imports?: Record<string, string>;
  /**
   * Font family for the code editor
   *
   * @default 'Fira Code'
   */
  fontFamily?: string;
  /**
   * Default editor engine component to use (Monaco or CodeMirror)
   *
   * @default CodeMirror
   */
  editor?: typeof CodeMirror | typeof Monaco;
}

export interface CodesparkContextValue extends ConfigContextValue, WorkspaceDerivedState, Pick<WorkspaceInit, 'framework'> {
  workspace?: Workspace;
  files: Record<string, string>;
  currentFile: FileNode;
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

/**
 * CodesparkProvider - A context provider that shares workspace state and configuration.
 *
 * Provides workspace instance, theme, framework type, and import maps to child components.
 * Required when using CodesparkEditor, CodesparkPreview, or CodesparkFileExplorer independently.
 * Automatically manages workspace state synchronization across all child components.
 */
export function CodesparkProvider(props: CodesparkProviderProps) {
  const { children, theme, framework = 'react', imports, editor, workspace = new Workspace({ entry: './App.tsx', files: { './App.tsx': '' }, framework }) } = props;
  const store = useWorkspace(workspace);

  return <CodesparkContext.Provider value={{ framework, imports, theme, editor, ...store }}>{children}</CodesparkContext.Provider>;
}
