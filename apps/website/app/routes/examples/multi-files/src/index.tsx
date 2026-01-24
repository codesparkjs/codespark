export function Button() {
  const handleClick = () => {
    console.log('clicked');
  };

  return (
    <button onClick={handleClick} className="mx-auto cursor-pointer rounded-lg bg-gray-100 px-3 py-2">
      Click Me
    </button>
  );
}
