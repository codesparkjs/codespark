import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <p className="text-2xl font-bold">{count}</p>
      <button onClick={() => setCount(count + 1)} className="rounded-lg bg-black px-4 py-2 text-white">
        Click me
      </button>
    </div>
  );
}
