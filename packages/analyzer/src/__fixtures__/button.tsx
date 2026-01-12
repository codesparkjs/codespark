import type { ReactNode } from 'react';

import { TestComp } from './host';

export const Button = ({ children }: { children: ReactNode }) => (
  <button className="btn">
    {children}
    <TestComp />
  </button>
);
