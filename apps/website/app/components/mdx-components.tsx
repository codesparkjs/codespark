import { Codespark, CodesparkEditor, type CodesparkEditorProps, CodesparkPreview, type CodesparkPreviewProps, type CodesparkProps, Link as InjectionLink, Style } from '@codespark/react';
import CODESPARK_STYLES from '@codespark/react/index.css?raw';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { Codepen, SquareArrowOutUpRight, Wind } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type HTMLAttributes, type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Icons } from '~/components/icons';
import { Button, buttonVariants } from '~/components/ui/button';
import { Toggle } from '~/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn, codesparkDevImports, encodeBase64URL } from '~/lib/utils';

interface StandalonePreviewProps {
  code?: string;
  height?: string | number;
  className?: string;
}

const injectTheme = (code: string, theme: string) => {
  return code.replace(/<(Codespark(?:Preview|Provider|Editor)?)\b(?![^>]*\btheme\b)([^>]*)(\/?>)/g, `<$1 theme="${theme}"$2$3`);
};

const StandalonePreview = ({ code, height = 452, className }: StandalonePreviewProps) => {
  const { resolvedTheme } = useTheme();
  const processedCode = code && resolvedTheme ? injectTheme(code, resolvedTheme) : code;

  return (
    <CodesparkPreview code={processedCode} height={height} className={className} imports={codesparkDevImports}>
      <InjectionLink rel="preconnect" href="https://fonts.googleapis.com" />
      <InjectionLink rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <InjectionLink href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap" rel="stylesheet" />
      <Style>{`body { padding: 0 } #root { width: 100% }`}</Style>
      <Style type="text/tailwindcss">{CODESPARK_STYLES}</Style>
    </CodesparkPreview>
  );
};

interface PreProps extends HTMLAttributes<HTMLPreElement> {
  preview?: string | boolean;
  height?: string;
}

function MdxPre({ preview, height, ...props }: PreProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const preCodeRef = useRef('');
  const [showPreview, setShowPreview] = useState(false);
  const [link, setLink] = useState('');

  const isBoilerplatePreview = typeof preview === 'string';
  const hasPreview = preview !== void 0;
  const parsedHeight = height ? Number(height) : undefined;

  useEffect(() => {
    if (isBoilerplatePreview) {
      setLink(`/playground?boilerplate=${preview}`);
    } else if (preRef.current) {
      const code = preRef.current.textContent;
      preCodeRef.current = code;
      encodeBase64URL(code).then(encoded => setLink(`/playground?code=${encoded}&embedded`));
    }
  }, []);

  const renderActions = ({ className, children }: { className?: string; children?: ReactNode }) => {
    const containerClassName = cn(className, 'pr-1.5', hasPreview && 'flex items-center', !isBoilerplatePreview && 'gap-x-1', showPreview && 'bg-surface');

    return (
      <div className={containerClassName}>
        {hasPreview && (
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to={link} className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}>
                  <Icons.logo className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Try in Playground</TooltipContent>
            </Tooltip>
            {!isBoilerplatePreview && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowPreview(v => !v)}>
                    <Codepen />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showPreview ? 'Show Code' : 'Show Preview'}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
        {children}
      </div>
    );
  };

  return (
    <CodeBlock {...props} className={cn(props.className, showPreview && 'bg-background!')} Actions={renderActions}>
      {showPreview ? (
        <StandalonePreview code={preCodeRef.current} height={parsedHeight} className="box-content pt-10" />
      ) : (
        <Pre ref={preRef} className="font-mono">
          {props.children}
        </Pre>
      )}
    </CodeBlock>
  );
}

function MdxCodespark({ code, files, ...props }: CodesparkProps): ReactElement {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tailwindcss, setTailwindcss] = useState(true);

  const handlePlaygroundNavigation = async () => {
    const codeOrFiles = code ? `const code = \`${code}\`;` : `const files = ${JSON.stringify(files)};`;
    const playgroundCode = `import { Codespark } from '@codespark/react';

${codeOrFiles}

export default function App() {
  return <Codespark ${code ? 'code={code}' : 'files={files}'} tailwindcss={${tailwindcss}} theme="${theme}" />;
}`;

    const encoded = await encodeBase64URL(playgroundCode);
    navigate({ pathname: '/playground', search: `?code=${encoded}&embedded` });
  };

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
          render: () => (
            <span>
              <Toggle size="sm" pressed={tailwindcss} onPressedChange={setTailwindcss}>
                <Wind />
              </Toggle>
            </span>
          )
        },
        {
          tooltip: 'Try in Playground',
          icon: <SquareArrowOutUpRight className="size-3.5!" />,
          onClick: handlePlaygroundNavigation
        }
      ]}
    />
  );
}

function MdxCodesparkEditor({ value, height }: CodesparkEditorProps) {
  return <CodesparkEditor value={value} height={height ? `${height}px` : undefined} containerProps={{ className: 'h-max' }} toolbox={['copy']} />;
}

function MdxCodesparkPreview({ code, height }: CodesparkPreviewProps) {
  return <StandalonePreview code={code} height={height} />;
}

export const mdxComponents = {
  pre: MdxPre,
  Codespark: MdxCodespark,
  CodesparkEditor: MdxCodesparkEditor,
  CodesparkPreview: MdxCodesparkPreview
};
