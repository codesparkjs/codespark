import { Codespark } from '@codespark/react';

const files = {
  './App.tsx': `import { Button } from './src';

export default function App() {
  return (
    <div className="flex justify-center">
      <Button />
    </div>
  );
}`,
  './src/index.tsx': `export function Button() {
  const handleClick = () => {
    console.log('clicked');
  };

  return (
    <button onClick={handleClick} className="mx-auto cursor-pointer rounded-lg bg-gray-100 px-3 py-2">
      Click Me
    </button>
  );
}`
};

export default function App() {
  return <Codespark files={files} onConsole={console.log} />;
}
