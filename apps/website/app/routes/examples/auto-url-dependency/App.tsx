import confetti from 'https://esm.sh/canvas-confetti@1.6.0';

export default function App() {
  return (
    <div className="flex justify-center">
      <button className="mx-auto rounded-lg bg-gray-100 px-4 py-2" onClick={() => confetti()}>
        import & run
      </button>
    </div>
  );
}
