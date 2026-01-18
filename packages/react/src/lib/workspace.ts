import type { CollectResult, Dep, ExternalDep, InternalDep } from '_shared/types';
import { analyzeReferences } from '@codespark/analyzer/browser';
import { ReactCompiler } from '@codespark/compiler';
import { type ComponentType, type ReactElement, useMemo, useSyncExternalStore } from 'react';
import { isElement, isFragment } from 'react-is';

import { useCodespark } from '@/context';

import { OPFS } from './opfs';
import { constructESMUrl, generateId } from './utils';

export interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  code?: string;
  children?: FileTreeNode[];
}

export interface WorkspaceInit {
  id?: string;
  template?: 'react' | 'vue' | 'preact' | 'markdown';
  entry: string;
  files: Record<string, string>;
}

export class Workspace extends OPFS {
  id: string;

  private originalFiles: Record<string, string>;
  private listeners = new Set<() => void>();
  private _deps: Dep[] | null = null;
  private _internalDeps: InternalDep[] | null = null;
  private _externalDeps: ExternalDep[] | null = null;
  private _imports: Record<string, string> | null = null;
  private _compiled: string | null = null;
  private _compileError: Error | null = null;
  private _fileTree: FileTreeNode[] | null = null;
  private _currentFile: FileTreeNode | null = null;

  constructor(private config: WorkspaceInit) {
    super();
    this.id = config.id ?? generateId('workspace');
    this.originalFiles = { ...config.files };
  }

  get entry() {
    return this.config.entry;
  }

  get template() {
    return this.config.template ?? 'react';
  }

  get files() {
    return this.config.files;
  }

  get fileTree() {
    if (!this._fileTree) {
      const root: FileTreeNode[] = [];
      const entries = Object.entries(this.config.files);
      const entryItem = entries.find(([path]) => path === this.config.entry);
      const deps = entries.filter(([path]) => path !== this.config.entry);
      const sorted = entryItem ? [entryItem, ...deps] : deps;

      for (const [filePath, code] of sorted) {
        if (filePath.startsWith('../')) {
          console.warn(`[Workspace] Ignoring file with invalid path: "${filePath}". Paths starting with "../" are not allowed.`);
          continue;
        }
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

      this._fileTree = root;
    }

    return this._fileTree;
  }

  get deps() {
    if (!this._deps) {
      this._deps = analyzeReferences(this.files[this.entry], this.files);
    }

    return this._deps;
  }

  get internalDeps() {
    if (!this._internalDeps) {
      const result: InternalDep[] = [];
      const collect = (deps: Dep[]) => {
        for (const dep of deps) {
          if ('code' in dep) {
            result.push(dep);
            collect(dep.deps);
          }
        }
      };
      collect(this.deps);
      this._internalDeps = result;
    }

    return this._internalDeps;
  }

  get externalDeps() {
    if (!this._externalDeps) {
      const result: ExternalDep[] = [];
      const collect = (deps: Dep[]) => {
        for (const dep of deps) {
          if ('version' in dep) {
            result.push(dep);
          } else {
            collect(dep.deps);
          }
        }
      };
      collect(this.deps);
      this._externalDeps = result;
    }

    return this._externalDeps;
  }

  get imports() {
    if (!this._imports) {
      this._imports = {
        ...this.externalDeps.reduce<Record<string, string>>((pre, { name, version, imported }) => {
          return {
            ...pre,
            [name]: constructESMUrl({ pkg: name, version, external: ['react', 'react-dom'], exports: imported.length ? imported : undefined })
          };
        }, {}),
        react: constructESMUrl({ pkg: 'react', version: '18.2.0' }),
        'react/jsx-runtime': constructESMUrl({ pkg: 'react/jsx-runtime', version: '18.2.0' }),
        'react-dom/client': constructESMUrl({ pkg: 'react-dom/client', version: '18.2.0' })
      };
    }

    return this._imports;
  }

  get compiled() {
    if (this._compiled === null) {
      try {
        this._compiled = this.compiler.compile(this.files[this.entry], this.deps);
        this._compileError = null;
      } catch (error) {
        this._compiled = '';
        this._compileError = error as Error;
      }
    }

    return this._compiled;
  }

  get compileError() {
    return this._compileError;
  }

  get currentFile(): FileTreeNode {
    if (!this._currentFile) {
      this._currentFile = { name: this.entry.split('/').pop() || this.entry, type: 'file', path: this.entry, code: this.files[this.entry] };
    }
    return this._currentFile;
  }

  _subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  setCurrentFile(path: string) {
    const file = this.getFile(path);
    if (file) {
      this._currentFile = file;
      this.listeners.forEach(fn => fn());
    }
  }

  getFile(path: string): FileTreeNode | undefined {
    const code = this.files[path];
    if (code === undefined) return undefined;
    return { name: path.split('/').pop() || path, type: 'file', path, code };
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
    this.invalidateCache();
    if (!path.endsWith('/')) {
      this.writeToOPFS(path, content);
    }
    this.listeners.forEach(fn => fn());
  }

  renameFile(oldPath: string, newName: string) {
    const isFolder = !(oldPath in this.files);
    const parentPath = oldPath.split('/').slice(0, -1).join('/');
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    if (isFolder) {
      const newFiles: Record<string, string> = {};
      for (const [path, content] of Object.entries(this.files)) {
        const normalizedPath = path.replace(/^\.\//, '');
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

    this.invalidateCache();
    this.listeners.forEach(fn => fn());
  }

  deleteFile(path: string) {
    const isEmptyFolder = path.endsWith('/');
    const normalizedPath = isEmptyFolder ? path.slice(0, -1) : path;
    const isFolder = isEmptyFolder || !(path in this.files);

    let newFiles: Record<string, string>;
    if (isFolder) {
      newFiles = Object.fromEntries(
        Object.entries(this.files).filter(([filePath]) => {
          const normalized = filePath.replace(/^\.\//, '');
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
        const normalized = f.replace(/^\.\//, '').replace(/\/$/, '');
        return normalized.startsWith(parentPath + '/') && normalized !== parentPath;
      });
      if (!hasFilesInParent) {
        newFiles[parentPath + '/'] = '';
      }
    }

    this.config.files = newFiles;

    if (this._currentFile?.path === path || this._currentFile?.path.startsWith(normalizedPath + '/')) {
      this._currentFile = { name: this.entry.split('/').pop() || this.entry, type: 'file', path: this.entry, code: this.files[this.entry] };
    }

    this.invalidateCache();
    this.listeners.forEach(fn => fn());
  }

  getOriginalCode(path: string): string | undefined {
    return this.originalFiles[path];
  }

  async initOPFS() {
    await super.initOPFS(this.files);
  }

  private get compiler() {
    return new ReactCompiler();
  }

  private invalidateCache() {
    this._deps = null;
    this._internalDeps = null;
    this._externalDeps = null;
    this._imports = null;
    this._compiled = null;
    this._compileError = null;
    this._fileTree = null;
  }
}

export interface CreateWorkspaceConfig extends Pick<WorkspaceInit, 'id' | 'template'> {
  name?: string;
  mode?: 'raw' | 'source' | 'packed';
}

export function createWorkspace(this: { __scanned?: CollectResult } | void, source: ComponentType | ReactElement, config?: CreateWorkspaceConfig) {
  const { id, template, name = 'App.tsx', mode = 'packed' } = config || {};

  if (!this?.__scanned) {
    return new Workspace({ id, entry: name, files: { [name]: source.toString() } });
  }

  const { entry, files } = this.__scanned;

  let packedCode: string;
  if (mode === 'raw') {
    packedCode = entry.code;
  } else if (mode === 'source') {
    packedCode = Object.values(files)[0];

    return new Workspace({ id, template, entry: name, files: { [name]: packedCode } });
  } else {
    const { code, locals, imports } = entry;
    const depDefs = imports.join('\n');
    const localDefs = locals.join('\n');
    packedCode = [depDefs, localDefs, isElement(source) || isFragment(source) ? `export default function App() {\n  return ${code}\n};` : `export default ${code};`].filter(Boolean).join('\n\n');
  }

  return new Workspace({ id, template, entry: name, files: { [name]: packedCode, ...files } });
}

export function useWorkspace(init?: WorkspaceInit | Workspace) {
  const { workspace: contextWorkspace } = useCodespark();

  if (!init && !contextWorkspace) {
    throw Error('Can not find any workspace instance. Make sure provide a workspace during runtime.');
  }

  const workspace = useMemo(() => {
    if (init instanceof Workspace) return init;

    if (contextWorkspace) return contextWorkspace;

    return new Workspace(init!);
  }, []);
  const files = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.files,
    () => workspace.files
  );
  const fileTree = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.fileTree,
    () => workspace.fileTree
  );
  const deps = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.deps,
    () => workspace.deps
  );
  const internalDeps = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.internalDeps,
    () => workspace.internalDeps
  );
  const externalDeps = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.externalDeps,
    () => workspace.externalDeps
  );
  const compiled = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.compiled,
    () => workspace.compiled
  );
  const imports = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.imports,
    () => workspace.imports
  );
  const compileError = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.compileError,
    () => workspace.compileError
  );
  const currentFile = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.currentFile,
    () => workspace.currentFile
  );

  return {
    files,
    fileTree,
    deps,
    internalDeps,
    externalDeps,
    compiled,
    compileError,
    imports,
    currentFile,
    workspace
  };
}
