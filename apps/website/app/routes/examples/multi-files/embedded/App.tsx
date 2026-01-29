import { Codespark } from '@codespark/react';

const files = {
  './App.tsx': `import { Button } from './components/button';

export default function App() {
  return (
    <div className="flex justify-center">
      <Button />
    </div>
  );
}`,
  './components/button.tsx': `import confetti from 'https://esm.sh/canvas-confetti@1.6.0';

export function Button() {
  return (
    <button className="mx-auto cursor-pointer rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700" onClick={() => confetti()}>
      Click Me
    </button>
  );
}`
};

export default function App() {
  return <Codespark files={files} />;
}
