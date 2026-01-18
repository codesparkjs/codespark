import { useWorkspace } from '@codespark/react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { Button } from '~/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '~/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '~/components/ui/input-group';

export interface FileExplorerContextMenuProps {
  children: ReactNode;
}

export function FileExplorerContextMenu(props: FileExplorerContextMenuProps) {
  const { children } = props;
  const { workspace, files } = useWorkspace();
  const [clickedType, setClickedType] = useState<'file' | 'folder' | null>(null);
  const [clickedPath, setClickedPath] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const parentPath = clickedType === 'folder' && clickedPath ? clickedPath : '';
  const existingNames = useMemo(() => {
    const prefix = parentPath ? `${parentPath}/` : '';
    const forFile = new Set<string>();
    const forFolder = new Set<string>();
    for (let filePath of Object.keys(files)) {
      // Normalize path by removing leading ./
      if (filePath.startsWith('./')) {
        filePath = filePath.slice(2);
      }
      const relativePath = prefix ? (filePath.startsWith(prefix) ? filePath.slice(prefix.length) : null) : filePath;
      if (relativePath) {
        forFile.add(relativePath);
        if (relativePath.includes('/')) {
          forFolder.add(relativePath.split('/')[0]);
        }
      }
    }
    return { forFile, forFolder };
  }, [files, parentPath]);

  const checkNameError = (name: string, existingNames: Set<string>) => {
    if (!name) return null;

    // Check for leading slash
    if (/^[/\\]/.test(name)) {
      return 'Name cannot start with slash';
    }

    // Check for relative path prefixes
    if (/^\.\.?(\/|$)/.test(name)) {
      return 'Name cannot start with . or ..';
    }

    // Check for leading/trailing spaces or dots
    if (/^\s|\s$/.test(name)) {
      return 'Name cannot start or end with spaces';
    }

    // Check for maximum length
    if (name.length > 255) {
      return 'Name is too long (max 255 characters)';
    }

    if (existingNames.has(name)) return 'A file or folder with this name already exists';
    return null;
  };

  const handleRename = () => {
    if (clickedPath && renameName) {
      workspace.renameFile(clickedPath, renameName);
      setRenameOpen(false);
    }
  };

  const handleNewFile = () => {
    if (newFileName && !checkNameError(newFileName, existingNames.forFile)) {
      const filePath = parentPath ? `${parentPath}/${newFileName}` : newFileName;
      workspace.setFile(`./${filePath}`, '');
      setNewFileOpen(false);
      setNewFileName('');
    }
  };

  const handleNewFolder = () => {
    if (newFolderName && !checkNameError(newFolderName, existingNames.forFolder)) {
      const trimmedName = newFolderName.replace(/\/+$/, '');
      const folderPath = parentPath ? `${parentPath}/${trimmedName}/` : `${trimmedName}/`;
      workspace.setFile(`./${folderPath}`, '');
      setNewFolderOpen(false);
      setNewFolderName('');
    }
  };

  const handleDelete = () => {
    if (clickedPath) {
      workspace.deleteFile(clickedPath);
      setDeleteOpen(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-type]')?.getAttribute('data-type') as 'file' | 'folder';
    const path = (e.target as HTMLElement).closest('[data-path]')?.getAttribute('data-path');
    setClickedType(target ?? null);
    setClickedPath(path ?? null);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          {clickedType !== 'file' && (
            <ContextMenuItem
              onSelect={() => {
                setNewFileName('');
                setNewFileOpen(true);
              }}>
              New File...
            </ContextMenuItem>
          )}
          {clickedType !== 'file' && (
            <ContextMenuItem
              onSelect={() => {
                setNewFolderName('');
                setNewFolderOpen(true);
              }}>
              New Folder...
            </ContextMenuItem>
          )}
          {clickedType === 'folder' ? <ContextMenuSeparator /> : null}
          {clickedType !== null && (
            <ContextMenuItem
              disabled={clickedPath === workspace.entry}
              onSelect={() => {
                if (clickedPath) {
                  setRenameName(clickedPath.split('/').pop() ?? '');
                  setRenameOpen(true);
                }
              }}>
              Rename...
            </ContextMenuItem>
          )}
          {clickedType !== null && (
            <ContextMenuItem disabled={clickedPath === workspace.entry} onSelect={() => setDeleteOpen(true)}>
              Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Rename {clickedType}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <Input value={renameName} onChange={e => setRenameName(e.target.value)} />
            {checkNameError(renameName, existingNames.forFile) && <p className="text-destructive text-sm">{checkNameError(renameName, existingNames.forFile)}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!renameName || !!checkNameError(renameName, existingNames.forFile)} onClick={handleRename}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={newFileOpen} onOpenChange={setNewFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <InputGroup>
              {parentPath ? (
                <InputGroupAddon>
                  <InputGroupText>{parentPath}/</InputGroupText>
                </InputGroupAddon>
              ) : null}
              <InputGroupInput className={parentPath ? 'pl-0.5!' : ''} placeholder="Enter file name" value={newFileName} onChange={e => setNewFileName(e.target.value)} />
            </InputGroup>
            {checkNameError(newFileName, existingNames.forFile) && <p className="text-destructive text-sm">{checkNameError(newFileName, existingNames.forFile)}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!newFileName || !!checkNameError(newFileName, existingNames.forFile)} onClick={handleNewFile}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <InputGroup>
              {parentPath ? (
                <InputGroupAddon>
                  <InputGroupText>{parentPath}/</InputGroupText>
                </InputGroupAddon>
              ) : null}
              <InputGroupInput className={parentPath ? 'pl-0.5!' : ''} placeholder="Enter folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
            </InputGroup>
            {checkNameError(newFolderName, existingNames.forFolder) && <p className="text-destructive text-sm">{checkNameError(newFolderName, existingNames.forFolder)}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!newFolderName || !!checkNameError(newFolderName, existingNames.forFolder)} onClick={handleNewFolder}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Delete {clickedType}</DialogTitle>
          </DialogHeader>
          <DialogDescription>Are you sure you want to delete &quot;{clickedPath?.split('/').pop()}&quot;? This action cannot be undone.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
