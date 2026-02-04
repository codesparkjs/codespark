import { CodesparkEditor, CodesparkPreview, CodesparkProvider, Workspace } from '@codespark/react';
import { Monaco } from '@codespark/react/monaco';
import { useMemo, useState } from 'react';

import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

import { APP, BUTTON, STYLE, UTILS } from './files';

const files = {
  './App.tsx': APP,
  './components/ui/button.tsx': BUTTON,
  './lib/utils.ts': UTILS,
  './style.tw.css': STYLE
};

export default function ButtonDemo() {
  const workspace = useMemo(() => new Workspace({ entry: './App.tsx', files }), []);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <CodesparkProvider workspace={workspace}>
      <div className="border-border flex flex-col overflow-hidden rounded-lg border">
        <CodesparkPreview className="border-border h-[200px] border-b" />
        <div className={cn('relative', collapsed ? 'h-30' : 'h-60')}>
          {collapsed ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
              <Button variant="outline" size="sm" onClick={() => setCollapsed(false)}>
                View Code
              </Button>
            </div>
          ) : null}
          <CodesparkEditor editor={Monaco} height="100%" toolbox={false} />
        </div>
      </div>
    </CodesparkProvider>
  );
}
