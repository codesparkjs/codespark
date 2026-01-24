import { useWorkspace } from '@codespark/react';
import { Check, Code, Copy, Maximize, Moon, MoreHorizontalIcon, RefreshCw, RemoveFormatting, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type ReactNode, useState } from 'react';

import { Button } from '~/components/ui/button';
import { ButtonGroup } from '~/components/ui/button-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Toggle } from '~/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useIsMobile } from '~/hooks/use-mobile';

interface ToolboxProps {
  children?: ReactNode;
  toggleFileExplorer?: () => void;
  embedded?: boolean;
  onToggleEmbedded?: (value: boolean) => void;
}

function ToolboxButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={onClick}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Toolbox({ children, toggleFileExplorer, embedded, onToggleEmbedded }: ToolboxProps) {
  const { workspace, currentFile } = useWorkspace();
  const [isCopied, setIsCopied] = useState(false);
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const getMainEditor = () => workspace.editors.get('main');
  const resetDocument = () => {
    const editor = getMainEditor();
    if (editor) {
      const { path } = currentFile;
      const initialCode = workspace.initialFiles[path] ?? '';
      editor.getModel()?.setValue(initialCode);
      workspace.setFile(path, initialCode);
    }
  };
  const formatDocument = () => {
    getMainEditor()?.getAction('editor.action.formatDocument')?.run();
  };
  const copyToClipboard = async () => {
    const content = getMainEditor()?.getModel()?.getValue() || '';
    await navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  if (isMobile) {
    return (
      <ButtonGroup>
        {children}
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
            <DropdownMenuItem onClick={toggleFileExplorer}>
              <Maximize className="text-foreground size-3.5!" />
              Toggle File Explorer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleEmbedded?.(!embedded)}>
              <Code className="text-foreground size-3.5!" />
              {embedded ? 'Disable Embedded' : 'Enable Embedded'}
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
      {children}
      <div>
        <ToolboxButton icon={<RefreshCw className="size-3.5!" />} label="Reset Document" onClick={resetDocument} />
        <ToolboxButton icon={<RemoveFormatting className="size-3.5!" />} label="Format Document" onClick={formatDocument} />
        <ToolboxButton icon={isCopied ? <Check className="size-3.5!" /> : <Copy className="size-3.5!" />} label={isCopied ? 'Copied' : 'Copy to Clipboard'} onClick={copyToClipboard} />
        <ToolboxButton icon={<Maximize className="size-3.5!" />} label="Toggle File Explorer" onClick={toggleFileExplorer} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle size="sm" pressed={embedded} onPressedChange={onToggleEmbedded}>
              <Code />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>{embedded ? 'Disable Embedded' : 'Enable Embedded'}</TooltipContent>
        </Tooltip>
        <ToolboxButton icon={isDark ? <Moon className="size-3.5!" /> : <Sun className="size-3.5!" />} label={isDark ? 'Dark' : 'Light'} onClick={toggleTheme} />
      </div>
    </div>
  );
}
