import { createWorkspace } from '@codespark/react';

import Button from './button';

const MyButton = () => <button>Click</button>;

const MyButton2 = () => <Button />;

const MyButton3 = () => <MyButton />;

createWorkspace(<></>, { name: 'example1.tsx' });

createWorkspace(<div>123</div>, { name: 'example2.tsx' });

createWorkspace(<Button />, { name: 'example3.tsx' });

createWorkspace(<MyButton />, { name: 'example4.tsx' });

createWorkspace(<MyButton2 />, { name: 'example5.tsx' });

createWorkspace(<MyButton3 />, { name: 'example6.tsx' });
