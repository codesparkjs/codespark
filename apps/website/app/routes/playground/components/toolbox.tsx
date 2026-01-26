import { useWorkspace } from '@codespark/react';
import { Check, Copy, Github, Moon, MoreHorizontalIcon, RefreshCw, RemoveFormatting, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';

import { getIconForLanguageExtension } from '~/components/icons';
import { Button } from '~/components/ui/button';
import { ButtonGroup } from '~/components/ui/button-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { SidebarTrigger } from '~/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useIsMobile } from '~/hooks/use-mobile';

interface ToolboxProps {
  example?: string;
  children?: ReactNode;
}

function ToolboxButton({ icon, label, onClick }: { icon?: ReactNode; label: string; onClick?: () => void }) {
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

export function Toolbox(props: ToolboxProps) {
  const { example, children } = props;
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
      editor.setValue(initialCode);
      workspace.setFile(path, initialCode);
    }
  };
  const formatDocument = () => {
    const editor = getMainEditor();
    if (editor) {
      editor.format();
    }
  };
  const copyToClipboard = async () => {
    const editor = getMainEditor();
    if (editor) {
      const content = editor.getValue();
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-x-2 px-2">
        {isMobile ? <SidebarTrigger /> : null}
        <span className="[&_svg]:text-code-foreground [&_svg]:size-4 [&_svg]:opacity-70">{getIconForLanguageExtension('typescript')}</span>
        <span className="text-card-foreground">{currentFile.path.replace(/^(\.\.?\/)+/, '')}</span>
      </div>
      {isMobile ? (
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
              <DropdownMenuItem asChild>
                <Link target="_blank" to={`https://github.com/codesparkjs/codespark/tree/develop/apps/website/app/routes/examples/${example}`}>
                  <Github className="text-foreground size-3.5!" />
                  Open in Github
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {isDark ? <Moon className="text-foreground size-3.5!" /> : <Sun className="text-foreground size-3.5!" />}
                {isDark ? 'Dark' : 'Light'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      ) : (
        <div className="flex items-center gap-x-3">
          {children}
          <div className="flex flex-nowrap">
            <ToolboxButton icon={<RefreshCw className="size-3.5!" />} label="Reset Document" onClick={resetDocument} />
            <ToolboxButton icon={<RemoveFormatting className="size-3.5!" />} label="Format Document" onClick={formatDocument} />
            <ToolboxButton icon={isCopied ? <Check className="size-3.5!" /> : <Copy className="size-3.5!" />} label={isCopied ? 'Copied' : 'Copy to Clipboard'} onClick={copyToClipboard} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link target="_blank" to={`https://github.com/codesparkjs/codespark/tree/develop/apps/website/app/routes/examples/${example}`}>
                    <Github />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in Github</TooltipContent>
            </Tooltip>
            <ToolboxButton icon={isDark ? <Moon className="size-3.5!" /> : <Sun className="size-3.5!" />} label={isDark ? 'Dark' : 'Light'} onClick={toggleTheme} />
          </div>
        </div>
      )}
    </div>
  );
}
