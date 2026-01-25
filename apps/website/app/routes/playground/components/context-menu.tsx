import { useWorkspace } from '@codespark/react';
import { type ReactNode, useMemo, useState } from 'react';

import { Button } from '~/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '~/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '~/components/ui/input-group';

type DialogType = 'rename' | 'newFile' | 'newFolder' | 'delete' | null;

export interface FileExplorerContextMenuProps {
  children: ReactNode;
}

function validateName(name: string, existingNames: Set<string>): string | null {
  if (!name) return null;
  if (/^[/\\]/.test(name)) return 'Name cannot start with slash';
  if (/^\.\.?(\/|$)/.test(name)) return 'Name cannot start with . or ..';
  if (/^\s|\s$/.test(name)) return 'Name cannot start or end with spaces';
  if (name.length > 255) return 'Name is too long (max 255 characters)';
  if (existingNames.has(name)) return 'A file or folder with this name already exists';
  return null;
}

export function FileExplorerContextMenu(props: FileExplorerContextMenuProps): ReactNode {
  const { children } = props;
  const { workspace, files } = useWorkspace();
  const [clickedType, setClickedType] = useState<'file' | 'folder' | null>(null);
  const [clickedPath, setClickedPath] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [inputValue, setInputValue] = useState('');
  const parentPath = clickedType === 'folder' && clickedPath ? clickedPath : '';
  const existingNames = useMemo(() => {
    const prefix = parentPath ? `${parentPath}/` : '';
    const forFile = new Set<string>();
    const forFolder = new Set<string>();

    for (const filePath of Object.keys(files)) {
      const normalizedPath = filePath.startsWith('./') ? filePath.slice(2) : filePath;
      const relativePath = prefix ? (normalizedPath.startsWith(prefix) ? normalizedPath.slice(prefix.length) : null) : normalizedPath;

      if (relativePath) {
        forFile.add(relativePath);
        const slashIndex = relativePath.indexOf('/');
        if (slashIndex !== -1) {
          forFolder.add(relativePath.slice(0, slashIndex));
        }
      }
    }
    return { forFile, forFolder };
  }, [files, parentPath]);
  const currentExistingNames = activeDialog === 'newFolder' ? existingNames.forFolder : existingNames.forFile;
  const inputError = validateName(inputValue, currentExistingNames);

  const closeDialog = () => {
    setActiveDialog(null);
    setInputValue('');
  };
  const handleRename = () => {
    if (clickedPath && inputValue && !inputError) {
      workspace.renameFile(clickedPath, inputValue);
      closeDialog();
    }
  };
  const handleNewFile = () => {
    if (inputValue && !inputError) {
      const filePath = parentPath ? `${parentPath}/${inputValue}` : inputValue;
      workspace.setFile(`./${filePath}`, '');
      closeDialog();
    }
  };
  const handleNewFolder = () => {
    if (inputValue && !inputError) {
      const trimmedName = inputValue.replace(/\/+$/, '');
      const folderPath = parentPath ? `${parentPath}/${trimmedName}/` : `${trimmedName}/`;
      workspace.setFile(`./${folderPath}`, '');
      closeDialog();
    }
  };
  const handleDelete = () => {
    if (clickedPath) {
      workspace.deleteFile(clickedPath);
      closeDialog();
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
          {clickedType !== 'file' && <ContextMenuItem onSelect={() => setActiveDialog('newFile')}>New File...</ContextMenuItem>}
          {clickedType !== 'file' && <ContextMenuItem onSelect={() => setActiveDialog('newFolder')}>New Folder...</ContextMenuItem>}
          {clickedType === 'folder' && <ContextMenuSeparator />}
          {clickedType !== null && (
            <ContextMenuItem
              disabled={clickedPath === workspace.entry}
              onSelect={() => {
                if (clickedPath) {
                  setInputValue(clickedPath.split('/').pop() ?? '');
                  setActiveDialog('rename');
                }
              }}>
              Rename...
            </ContextMenuItem>
          )}
          {clickedType !== null && (
            <ContextMenuItem disabled={clickedPath === workspace.entry} onSelect={() => setActiveDialog('delete')}>
              Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Rename Dialog */}
      <Dialog open={activeDialog === 'rename'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Rename {clickedType}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <Input value={inputValue} onChange={e => setInputValue(e.target.value)} />
            {inputError && <p className="text-destructive text-sm">{inputError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button disabled={!inputValue || !!inputError} onClick={handleRename}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New File Dialog */}
      <Dialog open={activeDialog === 'newFile'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <InputGroup>
              {parentPath && (
                <InputGroupAddon>
                  <InputGroupText>{parentPath}/</InputGroupText>
                </InputGroupAddon>
              )}
              <InputGroupInput className={parentPath ? 'pl-0.5!' : ''} placeholder="Enter file name" value={inputValue} onChange={e => setInputValue(e.target.value)} />
            </InputGroup>
            {inputError && <p className="text-destructive text-sm">{inputError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button disabled={!inputValue || !!inputError} onClick={handleNewFile}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={activeDialog === 'newFolder'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <InputGroup>
              {parentPath && (
                <InputGroupAddon>
                  <InputGroupText>{parentPath}/</InputGroupText>
                </InputGroupAddon>
              )}
              <InputGroupInput className={parentPath ? 'pl-0.5!' : ''} placeholder="Enter folder name" value={inputValue} onChange={e => setInputValue(e.target.value)} />
            </InputGroup>
            {inputError && <p className="text-destructive text-sm">{inputError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button disabled={!inputValue || !!inputError} onClick={handleNewFolder}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={activeDialog === 'delete'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Delete {clickedType}</DialogTitle>
          </DialogHeader>
          <DialogDescription>Are you sure you want to delete &quot;{clickedPath?.split('/').pop()}&quot;? This action cannot be undone.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
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
