import { Braces, ChevronRight, Codepen } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace';
import { Button } from '@/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';

export interface CodesparkFileExplorerProps {
  className?: string;
}

export function CodesparkFileExplorer(props: CodesparkFileExplorerProps) {
  const { className } = props;
  const { entryFile, depFiles, currentFile, workspace } = useWorkspace();

  return (
    <Tabs className={cn('bg-sidebar border-border box-border w-50 p-2', className)} orientation="vertical" value={currentFile.path} onValueChange={path => workspace.setCurrentFile(path)}>
      <TabsList className="bg-sidebar h-fit w-full flex-col items-start gap-2 p-0">
        <TabsTrigger value={entryFile.path} className="w-full justify-start">
          <Braces />
          <span className="truncate">{entryFile.name}</span>
        </TabsTrigger>
        {depFiles.length > 0 ? (
          <Collapsible defaultOpen={currentFile.path !== entryFile.path} className="group/collapsible w-full">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="hover:bg-sidebar-accent text-foreground h-7.5 w-full justify-between border border-transparent px-2! py-1">
                <div className="flex items-center gap-x-2">
                  <Codepen />
                  dependencies
                </div>
                <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 overflow-auto py-2 pl-5">
              {depFiles.map(({ path, name }) => {
                return (
                  <TabsTrigger value={path} key={path} className="w-full justify-start text-gray-400">
                    <Braces />
                    <span className="truncate">{name}</span>
                  </TabsTrigger>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </TabsList>
    </Tabs>
  );
}
