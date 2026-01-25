import { Codespark } from '@codespark/react';

const code = `import { Heart, Sparkles, Star } from 'lucide-react';

export default function App() {
  const icons = [Heart, Star, Sparkles];

  return (
    <div className="flex items-center justify-center gap-6 p-6">
      {icons.map((Icon, i) => (
        <Icon key={i} className="h-8 w-8" />
      ))}
    </div>
  );
}`;

export default function App() {
  return <Codespark code={code} />;
}
