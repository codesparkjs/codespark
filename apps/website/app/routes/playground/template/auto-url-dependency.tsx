import confetti from 'https://esm.sh/canvas-confetti@1.6.0';

export default function App() {
  return (
    <div className="flex justify-center">
      <button className="bg-secondary mx-auto rounded-lg px-4 py-2" onClick={() => confetti()}>
        import & run
      </button>
    </div>
  );
}
