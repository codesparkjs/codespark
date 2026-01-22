import type { CollectResult } from '_shared/types';
import type { Dep, ExternalDep, InternalDep } from '_shared/types';
import { type Framework, registry } from '@codespark/framework';
import type * as monaco from 'monaco-editor';
import { type ComponentType, type ReactElement, useMemo, useSyncExternalStore } from 'react';
import { isElement, isFragment } from 'react-is';

import { useCodespark } from '@/context';
import { constructESMUrl, generateId } from '@/lib/utils';

import { INTERNAL_INIT_OPFS, INTERNAL_REGISTER_EDITOR, INTERNAL_SUBSCRIBE, INTERNAL_UNREGISTER_EDITOR } from './internals';
import { OPFS } from './opfs';

export interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  code?: string;
  children?: FileTreeNode[];
}

export interface WorkspaceInit {
  id?: string;
  framework?: Framework | (new () => Framework) | string;
  entry: string;
  files: Record<string, string>;
}

export class Workspace extends OPFS {
  id: string;
  initialFiles: Record<string, string>;

  private listeners = new Set<() => void>();
  private _currentFile: FileTreeNode | null = null;
  private _editors = new Map<string, monaco.editor.IStandaloneCodeEditor>();

  constructor(private config: WorkspaceInit) {
    super();
    this.id = config.id ?? generateId('workspace');
    this.initialFiles = { ...config.files };
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn());
  }

  private createEntryFileNode(code?: string): FileTreeNode {
    return {
      name: this.entry.split('/').pop() || this.entry,
      type: 'file',
      path: this.entry,
      code: code ?? this.files[this.entry]
    };
  }

  private normalizePath(path: string): string {
    return path.replace(/^\.\//, '');
  }

  private getFile(path: string): FileTreeNode | undefined {
    const code = this.files[path];
    if (code === undefined) return undefined;

    return { name: path.split('/').pop() || path, type: 'file', path, code };
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

  get editors(): ReadonlyMap<string, monaco.editor.IStandaloneCodeEditor> {
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
  }

  setCurrentFile(path: string) {
    const file = this.getFile(path);
    if (file) {
      this._currentFile = file;
      this.notifyListeners();
    }
  }

  [INTERNAL_SUBSCRIBE](listener: () => void) {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  [INTERNAL_REGISTER_EDITOR](id: string, editor: monaco.editor.IStandaloneCodeEditor): void {
    this._editors.set(id, editor);
  }

  [INTERNAL_UNREGISTER_EDITOR](id: string): void {
    this._editors.delete(id);
  }

  async [INTERNAL_INIT_OPFS]() {
    await super.initOPFS(this.files);
  }
}

export interface WorkspaceDerivedState {
  fileTree: FileTreeNode[];
  deps: { style: InternalDep[]; internal: InternalDep[]; external: ExternalDep[]; imports: Record<string, string> };
  compiled: string;
  compileError: Error | null;
}

const workspaceCache = new WeakMap<Workspace, { files: Record<string, string>; state: WorkspaceDerivedState }>();

export function useWorkspace(init?: WorkspaceInit | Workspace) {
  const { workspace: contextWorkspace } = useCodespark();
  if (!init && !contextWorkspace) throw Error('Can not find any workspace instance. Make sure provide a workspace during runtime.');

  const workspace = useMemo(() => {
    if (init instanceof Workspace) return init;

    if (contextWorkspace) return contextWorkspace;

    return new Workspace(init!);
  }, []);
  const framework = useMemo(() => {
    const fwInput = workspace.framework;

    if (typeof fwInput === 'string') return registry.get(fwInput);

    if (typeof fwInput === 'function') return new fwInput();

    return fwInput;
  }, []);
  if (!framework) throw new Error(`Framework not found: ${workspace.framework}`);

  const files = useSyncExternalStore(
    cb => workspace[INTERNAL_SUBSCRIBE](cb),
    () => workspace.files,
    () => workspace.files
  );
  const currentFile = useSyncExternalStore(
    cb => workspace[INTERNAL_SUBSCRIBE](cb),
    () => workspace.currentFile,
    () => workspace.currentFile
  );
  const derivedState = useMemo(() => {
    const cached = workspaceCache.get(workspace);
    if (cached && cached.files === files) {
      return cached.state;
    }

    const buildFileTree = () => {
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
            current.push({ name, type: 'file', path: filePath, code });
          } else {
            let folder = current.find(n => n.type === 'folder' && n.name === name);
            if (!folder) {
              folder = { name, type: 'folder', path: currentPath, children: [] };
              current.push(folder);
            }
            current = folder.children!;
          }
        }
      }

      return root;
    };
    const computeDeps = () => {
      const style: InternalDep[] = [];
      const internal: InternalDep[] = [];
      const external: ExternalDep[] = [];
      const collect = (items: Dep[]) => {
        for (const dep of items) {
          if ('code' in dep) {
            if (dep.alias.endsWith('.css')) style.push(dep);
            internal.push(dep);
            collect(dep.deps);
          } else if ('version' in dep) {
            external.push(dep);
          }
        }
      };
      collect(framework.analyze(workspace.entry, files));

      return {
        style,
        internal,
        external,
        imports: {
          ...external.reduce<Record<string, string>>(
            (pre, { name, version, imported }) => ({
              ...pre,
              [name]: constructESMUrl({ pkg: name, version, external: ['react', 'react-dom'], exports: imported.length ? imported : undefined })
            }),
            {}
          ),
          ...framework.imports
        }
      };
    };
    const getCompileInfo = () => {
      try {
        framework.revoke();
        return { compiled: framework.compile(workspace.entry, files), compileError: null };
      } catch (error) {
        return { compiled: '', compileError: error as Error };
      }
    };

    const state: WorkspaceDerivedState = { fileTree: buildFileTree(), deps: computeDeps(), ...getCompileInfo() };
    workspaceCache.set(workspace, { files, state });

    return state;
  }, [files]);

  return { files, currentFile, ...derivedState, workspace };
}

export interface CreateWorkspaceConfig extends Pick<WorkspaceInit, 'id' | 'framework'> {
  name?: string;
  mode?: 'raw' | 'source' | 'packed';
}

export function createWorkspace(this: { __scanned?: CollectResult } | void, source: ComponentType | ReactElement, config?: CreateWorkspaceConfig) {
  const { id, framework, name = 'App.tsx', mode = 'packed' } = config || {};

  if (!this?.__scanned) {
    return new Workspace({ id, entry: name, files: { [name]: source.toString() } });
  }

  const { entry, files } = this.__scanned;

  let packedCode: string;
  if (mode === 'raw') {
    packedCode = entry.code;
  } else if (mode === 'source') {
    packedCode = Object.values(files)[0];

    return new Workspace({ id, framework, entry: name, files: { [name]: packedCode } });
  } else {
    const { code, locals, imports } = entry;
    const depDefs = imports.join('\n');
    const localDefs = locals.join('\n');
    packedCode = [depDefs, localDefs, isElement(source) || isFragment(source) ? `export default function App() {\n  return ${code}\n};` : `export default ${code};`].filter(Boolean).join('\n\n');
  }

  return new Workspace({ id, framework, entry: name, files: { [name]: packedCode, ...files } });
}
