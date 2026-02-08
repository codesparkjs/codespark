import { createWorkspace } from '@codespark/react';

createWorkspace('./button', { name: 'example1.tsx' });

createWorkspace('@/button', { name: 'example2.tsx' });

createWorkspace('@/string-path-nested', { name: 'example3.tsx' });
