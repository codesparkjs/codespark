import { Codespark } from '@codespark/react';

const files = {
  './App.tsx': `import './style.css';

export default function App() {
  return <div>This is my first Codes Park!</div>;
}
`,
  './style.css': `#root {
  background: #000;
  color: #fff;
}

.dark #root {
  background: #fff;
  color: #000;
}`
};

export default function App() {
  return <Codespark files={files} />;
}
