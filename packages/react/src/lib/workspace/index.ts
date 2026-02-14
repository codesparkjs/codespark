import { type Framework, type Output, registry } from '@codespark/framework';
import { LoaderType } from '@codespark/framework/loaders';
import { type ComponentType, type ReactElement, useId, useMemo, useSyncExternalStore } from 'react';
import { isElement, isFragment } from 'react-is';

import { useCodespark } from '@/context';
import type { EditorAdapter } from '@/lib/editor-adapter';
import { constructESMUrl, getLanguageFromFile } from '@/lib/utils';

import { INTERNAL_BOUND, INTERNAL_EMIT, INTERNAL_REGISTER_EDITOR, INTERNAL_SET_ID, INTERNAL_SUBSCRIBE, INTERNAL_UNREGISTER_EDITOR, NOOP_SUBSCRIBE } from './internals';
import { OPFS } from './opfs';

interface CollectResult {
  entry: { code: string; locals: string[]; imports: string[] };
  files: Record<string, string>;
}

export type FileTreeNode = FileNode | FolderNode;

export interface FileNode {
  type: 'file';
  name: string;
  path: string;
  code: string;
  language?: string;
}

export interface FolderNode {
  type: 'folder';
  name: string;
  path: string;
  children?: FileTreeNode[];
}

export interface WorkspaceInit {
  /**
   * Unique identifier for the workspace instance
   */
  id?: string;
  /**
   * Framework to use for code analysis and compilation.
   * Can be a Framework instance, a Framework constructor, or a registered framework name
   */
  framework?: Framework | (new () => Framework) | string;
  /**
   * Entry file path, the main file to compile and render
   *
   * @example './App.tsx'
   */
  entry: string;
  /**
   * Initial files mapping, where keys are file paths and values are file contents
   */
  files: Record<string, string>;
  /**
   * Whether to use Origin Private File System (OPFS) for file persistence
   *
   * @default false
   */
  OPFS?: boolean;
}

export interface WorkspaceEvent {
  /**
   * Fired when code compilation succeeds
   *
   * @param code - The compiled code string
   */
  compiled: (code: string) => void;
  /**
   * Fired when code compilation fails
   *
   * @param error - The compilation error
   */
  compileError: (error: Error) => void;
  /**
   * Fired when a single file is changed
   *
   * @param path - The file path that was changed
   * @param content - The new file content
   */
  fileChange: (path: string, content: string) => void;
  /**
   * Fired when all files are replaced via setFiles()
   *
   * @param files - The new files mapping
   */
  filesChange: (files: Record<string, string>) => void;
  /**
   * Fired when a file or folder is renamed
   *
   * @param oldPath - The original file path
   * @param newPath - The new file path
   */
  fileRename: (oldPath: string, newPath: string) => void;
  /**
   * Fired when a file or folder is deleted
   *
   * @param path - The deleted file path
   */
  fileDelete: (path: string) => void;
  /**
   * Fired when the currently active file changes
   *
   * @param file - The new current file node
   */
  currentFileChange: (file: FileNode) => void;
}

/**
 * Workspace - Core class for managing files, compilation, and editor state.
 *
 * Manages a virtual file system for code editing and live preview.
 * Handles file CRUD operations, tracks the currently active file,
 * and emits events for file changes and compilation results.
 * Supports optional Origin Private File System (OPFS) for persistence.
 */
export class Workspace extends OPFS {
  id: string;
  initialFiles: Record<string, string>;

  private listeners = new Set<() => void>();
  private events = new Map<keyof WorkspaceEvent, Set<WorkspaceEvent[keyof WorkspaceEvent]>>();
  private _currentFile: FileNode | null = null;
  private _editors = new Map<string, EditorAdapter>();
  private _bound = false;

  constructor(private config: WorkspaceInit) {
    super();
    const { id, OPFS = false, files } = config;
    this.id = id || '';
    this.initialFiles = { ...files };

    if (OPFS) {
      super.initOPFS(this.files);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn());
  }

  private createEntryFileNode(code?: string) {
    const name = this.entry.split('/').pop() || this.entry;

    return {
      name,
      type: 'file',
      path: this.entry,
      code: code ?? this.files[this.entry],
      language: getLanguageFromFile(name)
    } as FileNode;
  }

  private normalizePath(path: string) {
    return path.replace(/^\.\//, '');
  }

  private getFile(path: string) {
    const code = this.files[path];
    if (code === undefined) return;

    const name = path.split('/').pop() || path;
    return { name, type: 'file', path, code, language: getLanguageFromFile(name) } as FileNode;
  }

  get entry() {
    return this.config.entry;
  }

  get files() {
    return this.config.files;
  }

  get framework() {
    return this.config.framework ?? 'react';
  }

  get currentFile() {
    if (!this._currentFile) {
      this._currentFile = this.createEntryFileNode();
    }

    return this._currentFile;
  }

  get editors(): ReadonlyMap<string, EditorAdapter> {
    return this._editors;
  }

  setFile(path: string, content: string) {
    let newFiles = { ...this.config.files };
    if (!path.endsWith('/')) {
      const parts = path.split('/');
      const parentFolders = new Set<string>();
      for (let i = 1; i < parts.length; i++) {
        parentFolders.add(parts.slice(0, i).join('/') + '/');
      }
      newFiles = Object.fromEntries(Object.entries(newFiles).filter(([key]) => !parentFolders.has(key)));
    }
    newFiles[path] = content;
    this.config.files = newFiles;
    if (!path.endsWith('/')) {
      this.writeToOPFS(path, content);
    }
    if (this._currentFile && this._currentFile.path === path) {
      this._currentFile = { ...this._currentFile, code: content };
    }
    this.notifyListeners();
    this.emit('fileChange', path, content);
  }

  setFiles(files: Record<string, string>) {
    this.config.files = { ...files };
    this.initialFiles = { ...files };
    if (this._currentFile) {
      const newCode = files[this._currentFile.path];
      if (newCode !== undefined) {
        this._currentFile = { ...this._currentFile, code: newCode };
      } else {
        this._currentFile = this.createEntryFileNode(files[this.entry]);
      }
    }
    this.notifyListeners();
    this.emit('filesChange', files);
  }

  renameFile(oldPath: string, newName: string) {
    const isFolder = !(oldPath in this.files);
    const parentPath = oldPath.split('/').slice(0, -1).join('/');
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    if (isFolder) {
      const newFiles: Record<string, string> = {};
      for (const [path, content] of Object.entries(this.files)) {
        const normalizedPath = this.normalizePath(path);
        if (normalizedPath === oldPath || normalizedPath.startsWith(oldPath + '/')) {
          const newFilePath = path.replace(oldPath, newPath);
          newFiles[newFilePath] = content;
        } else {
          newFiles[path] = content;
        }
      }
      this.config.files = newFiles;
    } else {
      const content = this.files[oldPath];
      const { [oldPath]: _, ...rest } = this.files;
      this.config.files = { ...rest, [newPath]: content };
      this.writeToOPFS(newPath, content);
    }

    if (this._currentFile?.path === oldPath || this._currentFile?.path.startsWith(oldPath + '/')) {
      const newCurrentPath = isFolder ? newPath + this._currentFile.path.slice(oldPath.length) : newPath;
      this._currentFile = { ...this._currentFile, path: newCurrentPath, name: newCurrentPath.split('/').pop()! };
    }

    this.notifyListeners();
    this.emit('fileRename', oldPath, newPath);
  }

  deleteFile(path: string) {
    const isEmptyFolder = path.endsWith('/');
    const normalizedPath = isEmptyFolder ? path.slice(0, -1) : path;
    const isFolder = isEmptyFolder || !(path in this.files);

    let newFiles: Record<string, string>;
    if (isFolder) {
      newFiles = Object.fromEntries(
        Object.entries(this.files).filter(([filePath]) => {
          const normalized = this.normalizePath(filePath);
          return normalized !== path && normalized !== normalizedPath + '/' && !normalized.startsWith(normalizedPath + '/');
        })
      );
    } else {
      const { [path]: _, ...rest } = this.files;
      newFiles = rest;
    }

    // Check if parent folder becomes empty after deletion
    const parentPath = normalizedPath.split('/').slice(0, -1).join('/');
    if (parentPath) {
      const hasFilesInParent = Object.keys(newFiles).some(f => {
        const normalized = this.normalizePath(f).replace(/\/$/, '');
        return normalized.startsWith(parentPath + '/') && normalized !== parentPath;
      });
      if (!hasFilesInParent) {
        newFiles[parentPath + '/'] = '';
      }
    }

    this.config.files = newFiles;

    if (this._currentFile?.path === path || this._currentFile?.path.startsWith(normalizedPath + '/')) {
      this._currentFile = this.createEntryFileNode();
    }

    this.notifyListeners();
    this.emit('fileDelete', path);
  }

  setCurrentFile(path: string) {
    const file = this.getFile(path);
    if (file) {
      this._currentFile = file;
      this.notifyListeners();
      this.emit('currentFileChange', file);
    }
  }

  on<E extends keyof WorkspaceEvent>(event: E, callback: WorkspaceEvent[E]) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback as WorkspaceEvent[keyof WorkspaceEvent]);

    return () => this.off(event, callback);
  }

  off<E extends keyof WorkspaceEvent>(event: E, callback: WorkspaceEvent[E]) {
    this.events.get(event)?.delete(callback as WorkspaceEvent[keyof WorkspaceEvent]);
  }

  private emit<E extends keyof WorkspaceEvent>(event: E, ...args: Parameters<WorkspaceEvent[E]>) {
    this.events.get(event)?.forEach(cb => (cb as (...args: Parameters<WorkspaceEvent[E]>) => void)(...args));
  }

  [INTERNAL_SUBSCRIBE](listener: () => void) {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  [INTERNAL_REGISTER_EDITOR](id: string, editor: EditorAdapter) {
    this._editors.set(id, editor);
  }

  [INTERNAL_UNREGISTER_EDITOR](id: string) {
    this._editors.delete(id);
  }

  [INTERNAL_BOUND]() {
    if (this._bound) return true;
    this._bound = true;

    return false;
  }

  [INTERNAL_SET_ID](id: string) {
    this.id = id;
  }

  [INTERNAL_EMIT]<E extends keyof WorkspaceEvent>(event: E, ...args: Parameters<WorkspaceEvent[E]>) {
    this.emit(event, ...args);
  }
}

export interface WorkspaceDerivedState {
  /**
   * Hierarchical file tree structure for rendering file explorer
   */
  fileTree: FileTreeNode[];
  /**
   * Compiled code string ready for execution in the preview iframe
   */
  compiled: string;
  /**
   * Compilation error if the code failed to compile, null otherwise
   */
  compileError: Error | null;
  /**
   * Vendor resources extracted from the compilation process
   */
  vendor: {
    /**
     * ES modules extracted from the code
     */
    modules: Output<LoaderType.ESModule>[];
    /**
     * Style resources to inject into the preview
     */
    styles: Output<LoaderType.Style>[];
    /**
     * Script resources to inject into the preview
     */
    scripts: Output<LoaderType.Script>[];
    /**
     * Import map for external dependencies
     */
    imports: Record<string, string>;
  };
}

export interface UseWorkspaceReturn extends WorkspaceDerivedState {
  /**
   * Current files in the workspace, where keys are file paths and values are file contents
   */
  files: Record<string, string>;
  /**
   * Currently active file in the editor
   */
  currentFile: FileNode;
  /**
   * The Workspace instance for programmatic control
   */
  workspace: Workspace;
}

/**
 * Hook to manage workspace state and compilation.
 * Provides reactive access to files, compilation results, and workspace methods.
 *
 * @param init - WorkspaceInit config object or existing Workspace instance
 * @returns Workspace state including files, compiled code, and the workspace instance
 */
export function useWorkspace(init?: WorkspaceInit | Workspace): UseWorkspaceReturn {
  const uid = useId();
  const context = useCodespark();
  const workspace = useMemo(() => {
    let ws;

    if (init instanceof Workspace) {
      ws = init;
    } else if (init) {
      ws = new Workspace(init);
    } else {
      ws = context?.workspace;
    }

    if (!ws?.id) ws?.[INTERNAL_SET_ID](`workspace${uid}`);

    return ws;
  }, []);
  if (!workspace) throw Error('Can not find any workspace instance. Make sure provide a workspace during runtime.');

  const framework = useMemo(() => {
    const fwInput = workspace.framework;

    if (typeof fwInput === 'string') return registry.get(fwInput);

    if (typeof fwInput === 'function') return new fwInput();

    return fwInput;
  }, []);
  if (!framework) throw new Error(`Framework not found: ${workspace.framework}`);

  const standalone = context ? false : !workspace[INTERNAL_BOUND]();
  const subscribe = useMemo(() => (standalone ? (cb: () => void) => workspace[INTERNAL_SUBSCRIBE](cb) : NOOP_SUBSCRIBE), []);
  const files = useSyncExternalStore(
    subscribe,
    () => workspace.files,
    () => workspace.files
  );
  const currentFile = useSyncExternalStore(
    subscribe,
    () => workspace.currentFile,
    () => workspace.currentFile
  );
  const derivedState = useMemo<WorkspaceDerivedState>(() => {
    if (context) {
      const { fileTree, vendor, compiled, compileError } = context;

      return { fileTree, vendor, compiled, compileError };
    }

    const fileTree = (() => {
      const root: FileTreeNode[] = [];
      const entries = Object.entries(files);
      const entryItem = entries.find(([path]) => path === workspace.entry);
      const rest = entries.filter(([path]) => path !== workspace.entry);
      const sorted = entryItem ? [entryItem, ...rest] : rest;

      for (const [filePath, code] of sorted) {
        if (filePath.startsWith('../')) continue;
        const isEmptyFolder = filePath.endsWith('/');
        const normalizedPath = isEmptyFolder ? filePath.slice(0, -1) : filePath;
        const parts = normalizedPath.split('/').filter(p => p !== '.' && p !== '..');
        let current = root;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
          const name = parts[i];
          const isLast = i === parts.length - 1;
          currentPath = currentPath ? `${currentPath}/${name}` : name;

          if (isLast && !isEmptyFolder) {
            current.push({ name, type: 'file', path: filePath, code, language: getLanguageFromFile(name) });
          } else {
            let folder = current.find((n): n is FolderNode => n.type === 'folder' && n.name === name);
            if (!folder) {
              folder = { name, type: 'folder', path: currentPath, children: [] };
              current.push(folder);
            }
            current = folder.children!;
          }
        }
      }

      return root;
    })();

    try {
      framework.analyze(files);
      const compiled = framework.compile(workspace.entry);
      workspace[INTERNAL_EMIT]('compiled', compiled);
      const modules = framework.getOutput(LoaderType.ESModule);
      const styles = framework.getOutput(LoaderType.Style);
      const scripts = framework.getOutput(LoaderType.Script);
      const externals = modules
        .flatMap(({ externals }) => externals)
        .reduce<Record<string, Set<string>>>((acc, { name, imported }) => {
          if (!acc[name]) acc[name] = new Set();
          imported.forEach(i => acc[name].add(i));
          return acc;
        }, {});

      return {
        fileTree,
        compiled,
        compileError: null,
        vendor: {
          modules,
          styles,
          scripts,
          imports: {
            ...Object.entries(externals).reduce<Record<string, string>>((pre, [name, importedSet]) => {
              const imported = Array.from(importedSet);
              pre[name] = constructESMUrl({
                pkg: name,
                version: '',
                external: Object.keys(framework.imports),
                exports: imported.length ? imported : undefined
              });

              return pre;
            }, {}),
            ...framework.imports
          }
        }
      };
    } catch (error) {
      workspace[INTERNAL_EMIT]('compileError', error as Error);

      return {
        fileTree,
        compiled: '',
        compileError: error as Error,
        vendor: { modules: [], styles: [], scripts: [], imports: {} }
      };
    }
  }, [files]);

  return {
    files: context?.files ?? files,
    currentFile: context?.currentFile ?? currentFile,
    ...derivedState,
    workspace
  };
}

/**
 * Configuration options for createWorkspace function
 */
export interface CreateWorkspaceConfig extends Omit<WorkspaceInit, 'entry' | 'files'> {
  /**
   * Entry file name/path
   *
   * @default './App.tsx'
   */
  name?: string;
  /**
   * Code processing mode:
   * - 'raw': Use the raw scanned code as-is
   * - 'source': Use only the source file content
   * - 'packed': Bundle imports, locals, and component into a single file
   *
   * @default 'packed'
   */
  mode?: 'raw' | 'source' | 'packed';
}

/**
 * Creates a Workspace instance from a React component or element.
 * Typically used with the rollup plugin to create workspaces from components.
 *
 * @param this - Context containing scanned code information (injected by rollup plugin)
 * @param source - React component or element to create workspace from
 * @param config - Configuration options
 * @returns A new Workspace instance
 *
 * @example
 * ```tsx
 * // Used with rollup plugin
 * const workspace = createWorkspace(MyComponent, {
 *   name: './App.tsx',
 *   mode: 'packed'
 * });
 * ```
 */
export function createWorkspace(this: { __scanned?: CollectResult } | void, source: ComponentType | ReactElement, config?: CreateWorkspaceConfig) {
  const { name = './App.tsx', mode = 'packed', ...workspaceInit } = config || {};

  if (!this?.__scanned) {
    return new Workspace({ entry: name, files: { [name]: source.toString() } });
  }

  const { entry, files } = this.__scanned;

  let packedCode: string;
  if (mode === 'raw') {
    packedCode = entry.code;
  } else if (mode === 'source') {
    packedCode = Object.values(files)[0] || '';
    const sourceEntry = Object.keys(files)[0] || '';

    return new Workspace({ entry: sourceEntry, files, ...workspaceInit });
  } else {
    const { code, locals, imports } = entry;
    const depDefs = imports.join('\n');
    const localDefs = locals.join('\n');
    packedCode = [depDefs, localDefs, isElement(source) || isFragment(source) ? `export default function App() {\n  return ${code}\n};` : `export default ${code};`].filter(Boolean).join('\n\n');
  }

  return new Workspace({ entry: name, files: { [name]: packedCode, ...files }, ...workspaceInit });
}
