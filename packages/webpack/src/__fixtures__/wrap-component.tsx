import { createWorkspace } from '@codespark/react';
import { useMemo, useState } from 'react';

import Button from './button';

const MyButton = () => <button>Click</button>;

const MyButton2 = () => <Button />;

const MyButton3 = () => <MyButton />;

createWorkspace(() => <button>Click</button>, { name: 'example1.tsx' });

createWorkspace(Button, { name: 'example2.tsx' });

createWorkspace(MyButton, { name: 'example3.tsx' });

createWorkspace(MyButton2, { name: 'example4.tsx' });

createWorkspace(MyButton3, { name: 'example5.tsx' });

createWorkspace(
  function App() {
    const [count] = useState(0);

    return <button>{count}</button>;
  },
  { name: 'example6.tsx' }
);
