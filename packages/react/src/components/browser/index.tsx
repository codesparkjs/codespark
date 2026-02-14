import { type Framework, registry } from '@codespark/framework';
import { HttpFramework, ViteFramework } from '@codespark/framework/node';
import { useEffect, useMemo, useState } from 'react';

import { useCodespark } from '@/context';
import { cn } from '@/lib/utils';
import { useWorkspace, Workspace } from '@/lib/workspace';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/ui/input-group';

const parseUrlInput = (input: string) => {
  let path = input.trim();
  // Remove protocol if present
  path = path.replace(/^https?:\/\//, '');
  // Remove localhost:port prefix
  path = path.replace(/^localhost(:\d+)?/, '');
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return path;
};

export interface CodesparkBrowserProps {
  defaultPath?: string;
  onPathChange?: (path: string) => void;
  loading?: boolean;
  workspace?: Workspace;
  className?: string;
}

export function CodesparkBrowser(props: CodesparkBrowserProps) {
  const { workspace: contextWorkspace } = useCodespark() || {};
  const { defaultPath = '/', onPathChange, loading = false, className } = props;
  const { workspace } = useWorkspace(props.workspace ?? contextWorkspace);
  const [currentPath, setCurrentPath] = useState(defaultPath);
  const framework = useMemo(() => {
    const fwInput = workspace.framework;

    if (typeof fwInput === 'string') return registry.get(fwInput);

    if (typeof fwInput === 'function') return new fwInput();

    return fwInput;
  }, []);
  const supported = (fw?: Framework): fw is HttpFramework | ViteFramework => fw?.name === 'node-http' || fw?.name === 'node-vite';
  const [src, setSrc] = useState('about:blank');

  useEffect(() => {
    if (!supported(framework)) return;

    framework.on('serverReady', () => {
      handleRequest('/');
    });

    framework.on('serverShutdown', () => {
      setSrc('about:blank');
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'navigate') {
        const path = event.data.path;
        setCurrentPath(path);
        handleRequest(path);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleRequest = (path: string) => {
    if (!supported(framework)) return;

    framework.request(path).then(setSrc);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const path = parseUrlInput(currentPath);
    setCurrentPath(path);
    handleRequest(path);
  };

  return (
    <div className={cn('relative flex flex-col divide-y', className)}>
      {loading ? (
        <div className="absolute right-2 bottom-2 z-10 h-8 w-8 **:box-border">
          <div className="flex -translate-x-1 translate-y-[9px] scale-[0.13] **:absolute **:h-24 **:w-24">
            <div className="fill-mode-forwards **:border-foreground **:bg-background transform-[rotateX(-25.5deg)_rotateY(45deg)] animate-[cube-rotate_1s_linear_infinite] transform-3d **:rounded-lg **:border-10">
              <div className="origin-[50%_50%] transform-[rotateX(90deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateY(90deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateX(-90deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateY(-90deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateY(0deg)_translateZ(44px)]" />
              <div className="origin-[50%_50%] transform-[rotateY(-180deg)_translateZ(44px)]" />
            </div>
          </div>
        </div>
      ) : null}
      <form onSubmit={handleAddressSubmit} className="bg-muted/50 border-border relative z-10 flex items-center gap-2 p-2">
        <InputGroup>
          <InputGroupInput
            value={currentPath}
            onChange={e => {
              const path = e.target.value;
              setCurrentPath(path);
              onPathChange?.(path);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleAddressSubmit(e);
              }
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit" variant="secondary">
              Go
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
      {src === 'about:blank' ? (
        <div className="bg-background flex h-full w-full flex-1 flex-col items-center justify-center gap-4">
          <span className="text-muted-foreground/50 text-sm">Ready to preview</span>
          <div className="text-muted-foreground/30 flex gap-2 text-xs">
            <span>localhost</span>
            <span>•</span>
            <span>Press Go to navigate</span>
          </div>
        </div>
      ) : (
        <iframe src={src} className="h-full w-full flex-1" />
      )}
    </div>
  );
}
