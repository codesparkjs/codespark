import { Braces, ChevronRight, Folder } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';
import type { FileTreeNode } from '@/lib/workspace';
import { useWorkspace } from '@/lib/workspace';
import { Button } from '@/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';

export interface CodesparkFileExplorerProps extends React.ComponentPropsWithoutRef<typeof Tabs> {
  className?: string;
}

const sortNodes = (nodes: FileTreeNode[]) => {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

    return a.name.localeCompare(b.name);
  });
};

const FileTreeItem = ({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) => {
  if (node.type === 'file') {
    return (
      <TabsTrigger value={node.path} data-type="file" data-path={node.path} className="h-8 w-full justify-start border-transparent" style={{ paddingLeft: depth * 8 + 8 }}>
        <Braces className="size-4" />
        <span className="truncate">{node.name}</span>
      </TabsTrigger>
    );
  }

  return (
    <Collapsible className="flex w-full flex-col gap-1">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" data-type="folder" data-path={node.path} className="hover:bg-sidebar-accent text-foreground h-8 w-full justify-start border border-transparent py-1" style={{ paddingLeft: depth * 8 + 8, paddingRight: 8 }}>
          <ChevronRight className="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
          <Folder className="size-4" />
          <span className="truncate">{node.name}</span>
        </Button>
      </CollapsibleTrigger>
      {node.children?.length ? (
        <CollapsibleContent className="flex flex-col gap-1">
          {sortNodes(node.children).map(child => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
};

export const CodesparkFileExplorer = forwardRef<React.ComponentRef<typeof Tabs>, CodesparkFileExplorerProps>((props, ref) => {
  const { className, ...rest } = props;
  const { fileTree, currentFile, workspace } = useWorkspace();

  return (
    <Tabs ref={ref} className={cn('bg-sidebar border-border box-border w-50 p-2', className)} orientation="vertical" value={currentFile.path} onValueChange={path => workspace.setCurrentFile(path)} {...rest}>
      <TabsList className="bg-sidebar h-fit w-full flex-col items-start gap-1 p-0">
        {sortNodes(fileTree).map(node => (
          <FileTreeItem key={node.path} node={node} />
        ))}
      </TabsList>
    </Tabs>
  );
});

CodesparkFileExplorer.displayName = 'CodesparkFileExplorer';
