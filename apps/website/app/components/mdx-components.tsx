import { Codespark, CodesparkProps } from '@codespark/react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { SquareArrowOutUpRight, Wind } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { type HTMLAttributes, useRef } from 'react';
import { useNavigate } from 'react-router';

import { Icons } from '~/components/icons';
import { Button } from '~/components/ui/button';
import { Toggle } from '~/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn, encodeBase64URL } from '~/lib/utils';

export const mdxComponents = {
  pre: ({ preview, ...props }: HTMLAttributes<HTMLPreElement> & { preview?: string | boolean }) => {
    const pre = useRef<HTMLPreElement>(null);
    const navigate = useNavigate();

    return (
      <CodeBlock
        {...props}
        Actions={({ className, children }) => {
          return (
            <div className={cn(preview ? 'flex items-center pr-1.5' : '', className)}>
              {preview ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        if (typeof preview === 'string') {
                          navigate({ pathname: '/playground', search: `?boilerplate=${preview}` });
                        } else {
                          const code = pre.current?.textContent;

                          if (code) {
                            navigate({ pathname: '/playground', search: `?code=${await encodeBase64URL(code)}&embedded` });
                          }
                        }
                      }}>
                      <Icons.logo className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Try in Playground</TooltipContent>
                </Tooltip>
              ) : null}
              {children}
            </div>
          );
        }}>
        <Pre ref={pre}>{props.children}</Pre>
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
