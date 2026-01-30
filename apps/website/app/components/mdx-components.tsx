import { Codespark, CodesparkPreview, CodesparkProps, Style } from '@codespark/react';
import CODESPARK_STYLES from '@codespark/react/index.css?raw';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { Codepen, SquareArrowOutUpRight, Wind } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { type HTMLAttributes, useRef } from 'react';
import { Link, useNavigate } from 'react-router';

import { Icons } from '~/components/icons';
import { Button, buttonVariants } from '~/components/ui/button';
import { Toggle } from '~/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn, devModuleProxy, encodeBase64URL } from '~/lib/utils';

export const mdxComponents = {
  pre: ({ preview, ...props }: HTMLAttributes<HTMLPreElement> & { preview?: string | boolean }) => {
    const pre = useRef<HTMLPreElement>(null);
    const preCodeRef = useRef('');
    const [showPreview, setShowPreview] = useState(false);
    const [link, setLink] = useState('');

    useEffect(() => {
      if (typeof preview === 'string') {
        setLink(`/playground?boilerplate=${preview}`);
      } else if (pre.current) {
        const code = pre.current.textContent;
        preCodeRef.current = code;
        encodeBase64URL(code).then(encoded => setLink(`/playground?code=${encoded}&embedded`));
      }
    }, []);

    return (
      <CodeBlock
        {...props}
        className={cn(props.className, showPreview ? 'bg-background!' : '')}
        Actions={({ className, children }) => {
          return (
            <div className={cn(className, preview ? 'flex items-center gap-x-1 pr-1.5' : '', showPreview ? 'bg-surface' : '')}>
              {preview ? (
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to={link} className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}>
                        <Icons.logo className="size-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Try in Playground</TooltipContent>
                  </Tooltip>
                  {typeof preview === 'string' ? null : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setShowPreview(v => !v);
                          }}>
                          <Codepen />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{showPreview ? 'Show Code' : 'Show Preview'}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ) : null}
              {children}
            </div>
          );
        }}>
        {showPreview ? (
          <CodesparkPreview
            code={preCodeRef.current}
            className="box-content h-[452px] pt-10"
            imports={devModuleProxy(['@codespark/react', '@codespark/framework', '@codespark/framework/markdown', '@codespark/react/monaco', '@codespark/react/codemirror', 'react', 'react/jsx-runtime', 'react-dom/client'])}>
            <Style>{`body { padding: 0 } #root { width: 100% }`}</Style>
            <Style type="text/tailwindcss">{CODESPARK_STYLES}</Style>
          </CodesparkPreview>
        ) : (
          <Pre ref={pre}>{props.children}</Pre>
        )}
      </CodeBlock>
    );
  },
  Codespark: ({ code, files, ...props }: CodesparkProps) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [tailwindcss, setTailwindcss] = useState(true);
    const playgroundCode = `import { Codespark } from '@codespark/react';

${code ? `const code = \`${code}\`;` : `const files = ${JSON.stringify(files)};`}

export default function App() {
  return <Codespark ${code ? 'code={code}' : 'files={files}'} tailwindcss={${tailwindcss}} theme="${theme}" />;
}`;

    return (
      <Codespark
        code={code}
        files={files}
        tailwindcss={tailwindcss}
        {...props}
        toolbox={[
          'copy',
          {
            tooltip: tailwindcss ? 'Disable Tailwind CSS' : 'Enable Tailwind CSS',
            render: () => {
              return (
                <span>
                  <Toggle size="sm" pressed={tailwindcss} onPressedChange={setTailwindcss}>
                    <Wind />
                  </Toggle>
                </span>
              );
            }
          },
          {
            tooltip: 'Try in Playground',
            icon: <SquareArrowOutUpRight className="size-3.5!" />,
            onClick: async () => {
              navigate({ pathname: '/playground', search: `?code=${await encodeBase64URL(playgroundCode)}&embedded` });
            }
          }
        ]}
      />
    );
  }
};
