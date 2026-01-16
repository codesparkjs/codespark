import { Braces, ChevronRight, Folder } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FileTreeNode } from '@/lib/workspace';
import { useWorkspace } from '@/lib/workspace';
import { Button } from '@/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/ui/context-menu';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';

export interface CodesparkFileExplorerProps {
  className?: string;
}

function FileTreeItem({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  if (node.type === 'file') {
    return (
      <TabsTrigger value={node.path} className="w-full justify-start" style={{ paddingLeft: depth * 12 }}>
        <Braces className="size-4" />
        <span className="truncate">{node.name}</span>
      </TabsTrigger>
    );
  }

  return (
    <Collapsible defaultOpen className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="hover:bg-sidebar-accent text-foreground h-7.5 w-full justify-start gap-2 border border-transparent px-2 py-1" style={{ paddingLeft: depth * 12 }}>
          <ChevronRight className="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
          <Folder className="size-4" />
          <span className="truncate">{node.name}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {node.children?.map(child => (
          <FileTreeItem key={child.path} node={child} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CodesparkFileExplorer(props: CodesparkFileExplorerProps) {
  const { className } = props;
  const { fileTree, currentFile, workspace } = useWorkspace();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Tabs className={cn('bg-sidebar border-border box-border w-50 p-2', className)} orientation="vertical" value={currentFile.path} onValueChange={path => workspace.setCurrentFile(path)}>
          <TabsList className="bg-sidebar h-fit w-full flex-col items-start gap-1 p-0">
            {fileTree.map(node => (
              <FileTreeItem key={node.path} node={node} />
            ))}
          </TabsList>
        </Tabs>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem inset>
          Back
          <ContextMenuShortcut>⌘[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset disabled>
          Forward
          <ContextMenuShortcut>⌘]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset>
          Reload
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>More Tools</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem>Save Page...</ContextMenuItem>
            <ContextMenuItem>Create Shortcut...</ContextMenuItem>
            <ContextMenuItem>Name Window...</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Developer Tools</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>Show Bookmarks</ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem>Show Full URLs</ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value="pedro">
          <ContextMenuLabel inset>People</ContextMenuLabel>
          <ContextMenuRadioItem value="pedro">Pedro Duarte</ContextMenuRadioItem>
          <ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
