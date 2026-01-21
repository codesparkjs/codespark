import type { Dep, ExternalDep, InternalDep } from '_shared/types';
import type { Framework } from '@codespark/framework';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo } from 'react';

import { constructESMUrl } from '@/lib/utils';

import type { FileTreeNode, Workspace } from './index';

export interface WorkspaceDerivedState {
  fileTree: FileTreeNode[];
  deps: { style: InternalDep[]; internal: InternalDep[]; external: ExternalDep[] };
  compiled: string;
  compileError: Error | null;
  imports: Record<string, string>;
  filesSnapshot: Record<string, string>;
}

const workspaceAtomsMap = new WeakMap<Workspace, ReturnType<typeof createWorkspaceAtoms>>();

function buildFileTree(files: Record<string, string>, entry: string): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const entries = Object.entries(files);
  const entryItem = entries.find(([path]) => path === entry);
  const rest = entries.filter(([path]) => path !== entry);
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
}

function computeDeps(framework: Framework, entry: string, files: Record<string, string>) {
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
  collect(framework.analyze(entry, files));

  return { style, internal, external };
}

function computeImports(externalDeps: ExternalDep[], framework: Framework) {
  return {
    ...externalDeps.reduce<Record<string, string>>(
      (pre, { name, version, imported }) => ({
        ...pre,
        [name]: constructESMUrl({ pkg: name, version, external: ['react', 'react-dom'], exports: imported.length ? imported : undefined })
      }),
      {}
    ),
    ...framework.imports
  };
}

function computeDerivedState(workspace: Workspace, framework: Framework): WorkspaceDerivedState {
  const files = workspace.files;
  const fileTree = buildFileTree(files, workspace.entry);
  const deps = computeDeps(framework, workspace.entry, files);

  let compiled = '';
  let compileError: Error | null = null;
  try {
    framework.revoke();
    compiled = framework.compile(workspace.entry, files);
  } catch (error) {
    compileError = error as Error;
  }
  const imports = computeImports(deps.external, framework);

  return { fileTree, deps, compiled, compileError, imports, filesSnapshot: files };
}

function createWorkspaceAtoms(workspace: Workspace, framework: Framework) {
  const initialState = computeDerivedState(workspace, framework);
  const derivedStateAtom = atom<WorkspaceDerivedState>(initialState);
  const updateDerivedStateAtom = atom(null, (get, set) => {
    const currentState = get(derivedStateAtom);
    if (currentState.filesSnapshot === workspace.files) {
      return;
    }
    const newState = computeDerivedState(workspace, framework);
    set(derivedStateAtom, newState);
  });

  return { derivedStateAtom, updateDerivedStateAtom };
}

export function useDerivedState(workspace: Workspace, framework: Framework, files: Record<string, string>) {
  const atoms = useMemo(() => {
    let atoms = workspaceAtomsMap.get(workspace);
    if (!atoms) {
      atoms = createWorkspaceAtoms(workspace, framework);
      workspaceAtomsMap.set(workspace, atoms);
    }

    return atoms;
  }, []);
  const updateDerivedState = useSetAtom(atoms.updateDerivedStateAtom);
  const derivedState = useAtomValue(atoms.derivedStateAtom);

  useEffect(() => {
    updateDerivedState();
  }, [files]);

  return derivedState;
}
