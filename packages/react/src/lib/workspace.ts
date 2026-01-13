import type { CollectResult, Dep, ExternalDep, InternalDep } from '_shared/types';
import { analyzeReferences } from '@codespark/analyzer/browser';
import { ReactCompiler } from '@codespark/compiler';
import { type ComponentType, type ReactElement, useMemo, useSyncExternalStore } from 'react';
import { isElement, isFragment } from 'react-is';

import { useCodespark } from '@/components/context';

import { OPFS } from './opfs';
import { constructESMUrl, generateId } from './utils';

interface WorkspaceFile {
  path: string;
  name: string;
  code: string;
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
  private _entryFile: WorkspaceFile | null = null;
  private _depFiles: WorkspaceFile[] | null = null;
  private _deps: Dep[] | null = null;
  private _internalDeps: InternalDep[] | null = null;
  private _externalDeps: ExternalDep[] | null = null;
  private _imports: Record<string, string> | null = null;
  private _compiled: string | null = null;
  private _compileError: Error | null = null;

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

  get deps(): Dep[] {
    if (!this._deps) {
      this._deps = analyzeReferences(this.files[this.entry], this.files);
    }

    return this._deps;
  }

  get internalDeps(): InternalDep[] {
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

  get externalDeps(): ExternalDep[] {
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

  get entryFile(): WorkspaceFile {
    if (!this._entryFile) {
      this._entryFile = this.allFiles[0];
    }

    return this._entryFile;
  }

  get depFiles(): WorkspaceFile[] {
    if (!this._depFiles) {
      this._depFiles = this.allFiles.slice(1);
    }

    return this._depFiles;
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
        this._compiled = this.compiler.compile(this.entryFile.code, this.deps);
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

  _subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  setFile(path: string, content: string) {
    this.config.files = { ...this.config.files, [path]: content };
    this.invalidateCache();
    this.writeToOPFS(path, content);
    this.listeners.forEach(fn => fn()); // notify
  }

  getFile(path: string): WorkspaceFile | undefined {
    return this.allFiles.find(f => f.path === path);
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

  private get allFiles(): WorkspaceFile[] {
    const entries = Object.entries(this.config.files);
    const entry = entries.find(([path]) => path === this.config.entry);
    const deps = entries.filter(([path]) => path !== this.config.entry);

    return (entry ? [entry, ...deps] : deps).map(([path, code]) => ({
      path,
      name: path.split('/').pop() || path,
      code
    }));
  }

  private invalidateCache() {
    this._entryFile = null;
    this._depFiles = null;
    this._deps = null;
    this._internalDeps = null;
    this._externalDeps = null;
    this._imports = null;
    this._compiled = null;
    this._compileError = null;
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
  const entryFile = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.entryFile,
    () => workspace.entryFile
  );
  const depFiles = useSyncExternalStore(
    cb => workspace._subscribe(cb),
    () => workspace.depFiles,
    () => workspace.depFiles
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

  return {
    files,
    entryFile,
    depFiles,
    deps,
    internalDeps,
    externalDeps,
    compiled,
    compileError,
    imports,
    workspace
  };
}
