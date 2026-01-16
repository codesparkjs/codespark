import { Braces, ChevronRight, Folder } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import type { FileTreeNode } from '@/lib/workspace';
import { useWorkspace } from '@/lib/workspace';
import { Button } from '@/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/ui/context-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';

export interface CodesparkFileExplorerProps {
  className?: string;
}

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

    return a.name.localeCompare(b.name);
  });
}

function FileTreeItem({ node, depth = 1 }: { node: FileTreeNode; depth?: number }) {
  if (node.type === 'file') {
    return (
      <TabsTrigger value={node.path} data-type="file" data-path={node.path} className="h-8 w-full justify-start border-transparent" style={{ paddingLeft: depth * 8 }}>
        <Braces className="size-4" />
        <span className="truncate">{node.name}</span>
      </TabsTrigger>
    );
  }

  return (
    <Collapsible className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" data-type="folder" data-path={node.path} className="hover:bg-sidebar-accent text-foreground h-8 w-full justify-start border border-transparent py-1" style={{ paddingLeft: depth * 8, paddingRight: 8 }}>
          <ChevronRight className="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
          <Folder className="size-4" />
          <span className="truncate">{node.name}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {sortNodes(node.children ?? []).map(child => (
          <FileTreeItem key={child.path} node={child} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CodesparkFileExplorer(props: CodesparkFileExplorerProps) {
  const { className } = props;
  const { fileTree, currentFile, workspace } = useWorkspace();
  const [clickedType, setClickedType] = useState<'file' | 'folder' | null>(null);
  const [clickedPath, setClickedPath] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState('');

  const handleRename = () => {
    if (clickedPath && renameName) {
      workspace.renameFile(clickedPath, renameName);
      setRenameOpen(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Tabs
            className={cn('bg-sidebar border-border box-border w-50 p-2', className)}
            orientation="vertical"
            value={currentFile.path}
            onValueChange={path => workspace.setCurrentFile(path)}
            onContextMenu={e => {
              const target = (e.target as HTMLElement).closest('[data-type]')?.getAttribute('data-type') as 'file' | 'folder';
              const path = (e.target as HTMLElement).closest('[data-path]')?.getAttribute('data-path');
              setClickedType(target ?? null);
              setClickedPath(path ?? null);
            }}>
            <TabsList className="bg-sidebar h-fit w-full flex-col items-start gap-1 p-0">
              {sortNodes(fileTree).map(node => (
                <FileTreeItem key={node.path} node={node} />
              ))}
            </TabsList>
          </Tabs>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          {clickedType !== 'file' && <ContextMenuItem>New File...</ContextMenuItem>}
          {clickedType !== 'file' && <ContextMenuItem>New Folder...</ContextMenuItem>}
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
        </ContextMenuContent>
      </ContextMenu>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Rename {clickedType}</DialogTitle>
          </DialogHeader>
          <Input value={renameName} onChange={e => setRenameName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
