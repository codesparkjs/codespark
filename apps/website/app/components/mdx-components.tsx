import { Codespark, CodesparkProps } from '@codespark/react';
import { SquareArrowOutUpRight, Wind } from 'lucide-react';
import lz from 'lz-string';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Toggle } from '~/components/ui/toggle';

const { compressToEncodedURIComponent } = lz;

export const mdxComponents = {
  Codespark: ({ code }: CodesparkProps) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [tailwindcss, setTailwindcss] = useState(false);
    const playgroundCode = `import { Codespark } from '@codespark/react';

const code = \`${code}\`;

export default function App() {
  return <Codespark code={code} theme="${theme}" />;
}`;

    return (
      <Codespark
        code={code}
        tailwindcss={tailwindcss}
        useToolbox={[
          'copy',
          {
            tooltip: 'Toggle Tailwind',
            render: () => {
              return (
                <Toggle size="sm" pressed={tailwindcss} onPressedChange={setTailwindcss}>
                  <Wind />
                </Toggle>
              );
            }
          },
          {
            tooltip: 'Try in Playground',
            icon: <SquareArrowOutUpRight className="size-3.5!" />,
            onClick: () => {
              navigate({
                pathname: '/playground',
                search: `?code=${compressToEncodedURIComponent(playgroundCode)}`
              });
            }
          }
        ]}
      />
    );
  }
};
