import type { CollectResult, Dep, ExternalDep, InternalDep } from '_shared/types';
import { registry } from '@codespark/framework';
import { type ComponentType, type ReactElement, useMemo, useSyncExternalStore } from 'react';
import { isElement, isFragment } from 'react-is';

import { useCodespark } from '@/context';
import { constructESMUrl, generateId } from '@/lib/utils';

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
  template?: 'react' | 'vue' | 'preact' | 'markdown';
  entry: string;
  files: Record<string, string>;
}

export class Workspace extends OPFS {
  id: string;

  private originalFiles: Record<string, string>;
  private listeners = new Set<() => void>();
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

  get currentFile() {
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

    this.listeners.forEach(fn => fn());
  }

  getOriginalCode(path: string): string | undefined {
    return this.originalFiles[path];
  }

  async initOPFS() {
    await super.initOPFS(this.files);
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

  if (!init && !contextWorkspace) throw Error('Can not find any workspace instance. Make sure provide a workspace during runtime.');

  const workspace = useMemo(() => {
    if (init instanceof Workspace) return init;

    if (contextWorkspace) return contextWorkspace;

    return new Workspace(init!);
  }, []);
  const framework = registry.get(workspace.template);
  if (!framework) throw new Error(`Framework not found: ${workspace.template}`);

  const files = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.files,
    () => workspace.files
  );
  const currentFile = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.currentFile,
    () => workspace.currentFile
  );
  const fileTree = useMemo(() => {
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
  }, [files]);
  const deps = useMemo(() => {
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

    return { style, internal, external };
  }, [files]);
  const { compiled, compileError } = useMemo(() => {
    try {
      framework.revoke();
      return { compiled: framework.compile(workspace.entry, files), compileError: null };
    } catch (error) {
      return { compiled: '', compileError: error as Error };
    }
  }, [files]);
  const imports = useMemo(() => {
    return {
      ...deps.external.reduce<Record<string, string>>(
        (pre, { name, version, imported }) => ({
          ...pre,
          [name]: constructESMUrl({ pkg: name, version, external: ['react', 'react-dom'], exports: imported.length ? imported : undefined })
        }),
        {}
      ),
      ...framework.imports
    };
  }, [deps.external]);

  return { files, currentFile, fileTree, deps, imports, compiled, compileError, workspace };
}
