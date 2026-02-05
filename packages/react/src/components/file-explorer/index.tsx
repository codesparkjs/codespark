import { Braces, ChevronRight, Folder } from 'lucide-react';
import { forwardRef, type ReactNode, useState } from 'react';

import { cn } from '@/lib/utils';
import type { FileTreeNode } from '@/lib/workspace';
import { useWorkspace } from '@/lib/workspace';
import { Button } from '@/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';

const sortNodes = (nodes: FileTreeNode[]) => {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

    return a.name.localeCompare(b.name);
  });
};

export interface FileExplorerItemRenderContext {
  node: FileTreeNode;
  depth: number;
  isSelected: boolean;
  isOpen?: boolean;
}

interface FileTreeItemProps {
  node: FileTreeNode;
  defaultOpen?: boolean;
  depth?: number;
  currentPath: string;
  renderItem?: (context: FileExplorerItemRenderContext) => ReactNode;
}

const FileTreeItem = ({ node, defaultOpen, depth = 0, currentPath, renderItem }: FileTreeItemProps) => {
  const isSelected = node.type === 'file' && node.path === currentPath;
  const [open, setOpen] = useState(defaultOpen);
  const customContent = renderItem?.({ node, depth, isSelected, isOpen: node.type === 'file' ? void 0 : open });

  if (node.type === 'file') {
    return (
      <TabsTrigger value={node.path} data-type="file" data-path={node.path} className="h-8 w-full justify-start border-transparent" style={{ paddingLeft: depth * 8 + 8 }}>
        {customContent ?? (
          <>
            <Braces className="size-4" />
            <span className="truncate">{node.name}</span>
          </>
        )}
      </TabsTrigger>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen} open={open} onOpenChange={setOpen} className="flex w-full flex-col gap-1">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" data-type="folder" data-path={node.path} className="hover:bg-sidebar-accent text-foreground h-8 w-full justify-start border border-transparent py-1" style={{ paddingLeft: depth * 8 + 8, paddingRight: 8 }}>
          {customContent ?? (
            <>
              <ChevronRight className="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
              <Folder className="size-4" />
              <span className="truncate">{node.name}</span>
            </>
          )}
        </Button>
      </CollapsibleTrigger>
      {node.children?.length ? (
        <CollapsibleContent className="flex flex-col gap-1">
          {sortNodes(node.children).map(child => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} currentPath={currentPath} defaultOpen={defaultOpen} renderItem={renderItem} />
          ))}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
};

export interface CodesparkFileExplorerProps extends React.ComponentPropsWithoutRef<typeof Tabs> {
  /**
   * Additional CSS class name(s) to apply to the file explorer container.
   */
  className?: string;
  /**
   * Whether folders should be expanded by default.
   *
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * Custom render function for file tree items.
   * Return a ReactNode to replace the default content (icon and name).
   * Return undefined or null to use the default rendering.
   */
  renderItem?: (context: FileExplorerItemRenderContext) => ReactNode;
}

/**
 * CodesparkFileExplorer - A file tree explorer component for navigating multi-file workspaces.
 *
 * Displays a hierarchical view of files and folders in the workspace.
 * Supports file selection to switch the active file in the editor.
 * Automatically sorts items with folders first, then files alphabetically.
 */
export const CodesparkFileExplorer = forwardRef<React.ComponentRef<typeof Tabs>, CodesparkFileExplorerProps>((props, ref) => {
  const { className, defaultOpen = false, renderItem, ...rest } = props;
  const { fileTree, currentFile, workspace } = useWorkspace();

  return (
    <Tabs ref={ref} className={cn('bg-sidebar border-border box-border w-50 p-2', className)} orientation="vertical" value={currentFile.path} onValueChange={path => workspace.setCurrentFile(path)} {...rest}>
      <TabsList className="bg-sidebar h-fit w-full flex-col items-start gap-1 p-0">
        {sortNodes(fileTree).map(node => {
          return <FileTreeItem key={node.path} node={node} currentPath={currentFile.path} defaultOpen={defaultOpen} renderItem={renderItem} />;
        })}
      </TabsList>
    </Tabs>
  );
});

CodesparkFileExplorer.displayName = 'CodesparkFileExplorer';
