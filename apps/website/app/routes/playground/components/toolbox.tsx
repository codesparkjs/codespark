import { useWorkspace } from '@codespark/react';
import { Check, Copy, Moon, MoreHorizontalIcon, RefreshCw, RemoveFormatting, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { ButtonGroup } from '~/components/ui/button-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useIsMobile } from '~/hooks/use-mobile';

export function Toolbox(props: { examples: string[]; defaultExample?: string; onSelectExample?: (key: string) => void }) {
  const { examples, defaultExample, onSelectExample } = props;
  const { workspace, currentFile } = useWorkspace();
  const [isCopied, setIsCopied] = useState(false);
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const resetDocument = () => {
    const editor = workspace.editors.get('main');
    if (editor) {
      const { path } = currentFile;
      const initialCode = workspace.initialFiles[path] ?? '';
      editor.getModel()?.setValue(initialCode);
      workspace.setFile(path, initialCode);
    }
  };
  const formatDocument = () => {
    const editor = workspace.editors.get('main');
    editor?.getAction('editor.action.formatDocument')?.run();
  };
  const copyToClipboard = async () => {
    const editor = workspace.editors.get('main');
    const content = editor?.getModel()?.getValue() || '';
    await navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (isMobile) {
    return (
      <ButtonGroup>
        <Select defaultValue={defaultExample} onValueChange={onSelectExample}>
          <SelectTrigger className="w-50">
            <SelectValue placeholder="Select an example..." />
          </SelectTrigger>
          <SelectContent>
            {examples.map(key => {
              return (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="More Options">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-50" sideOffset={8}>
            <DropdownMenuItem onClick={resetDocument}>
              <RefreshCw className="text-foreground size-3.5!" />
              Reset Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={formatDocument}>
              <RemoveFormatting className="text-foreground size-3.5!" />
              Format Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyToClipboard}>
              {isCopied ? <Check className="text-foreground size-3.5!" /> : <Copy className="text-foreground size-3.5!" />}
              {isCopied ? 'Copied' : 'Copy to Clipboard'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              {isDark ? <Moon className="text-foreground size-3.5!" /> : <Sun className="text-foreground size-3.5!" />}
              {isDark ? 'Dark' : 'Light'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    );
  }

  return (
    <div className="flex items-center gap-x-3">
      <Select defaultValue={defaultExample} onValueChange={onSelectExample}>
        <SelectTrigger className="w-50">
          <SelectValue placeholder="Select an example..." />
        </SelectTrigger>
        <SelectContent>
          {examples.map(key => {
            return (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={resetDocument}>
              <RefreshCw className="size-3.5!" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset Document</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={formatDocument}>
              <RemoveFormatting className="size-3.5!" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Format Document</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={copyToClipboard}>
              {isCopied ? <Check className="size-3.5!" /> : <Copy className="size-3.5!" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCopied ? 'Copied' : 'Copy to Clipboard'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
              {isDark ? <Moon className="size-3.5!" /> : <Sun className="size-3.5!" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? 'Dark' : 'Light'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
