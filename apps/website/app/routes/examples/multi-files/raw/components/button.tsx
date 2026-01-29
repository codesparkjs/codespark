import confetti from 'https://esm.sh/canvas-confetti@1.6.0';

export function Button() {
  return (
    <button className="mx-auto cursor-pointer rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700" onClick={() => confetti()}>
      Click Me
    </button>
  );
}
