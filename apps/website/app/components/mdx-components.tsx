import { Codespark, CodesparkProps } from '@codespark/react';
import { SquareArrowOutUpRight, Wind } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Toggle } from '~/components/ui/toggle';
import { encodeBase64URL } from '~/lib/utils';

export const mdxComponents = {
  Codespark: ({ code }: CodesparkProps) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [tailwindcss, setTailwindcss] = useState(true);
    const playgroundCode = `import { Codespark } from '@codespark/react';

const code = \`${code}\`;

export default function App() {
  return <Codespark code={code} tailwindcss={${tailwindcss}} theme="${theme}" />;
}`;

    return (
      <Codespark
        code={code}
        tailwindcss={tailwindcss}
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
              navigate({
                pathname: '/playground',
                search: `?code=${await encodeBase64URL(playgroundCode)}&embedded`
              });
            }
          }
        ]}
      />
    );
  }
};
