import { Children, isValidElement, type ReactNode, useEffect, useState } from 'react';

import { serializeAttributes } from '@/lib/utils';

export interface StyleProps extends Omit<React.StyleHTMLAttributes<HTMLStyleElement>, 'children'> {
  children?: string;
}

export function Style(_props: StyleProps) {
  return null;
}

export interface ScriptProps extends Omit<React.ScriptHTMLAttributes<HTMLScriptElement>, 'children'> {
  children?: string;
}

export function Script(_props: ScriptProps) {
  return null;
}

export interface LinkProps extends React.LinkHTMLAttributes<HTMLLinkElement> {}

export function Link(_props: LinkProps) {
  return null;
}

export function useInjections(children: ReactNode) {
  const [injections, setInjections] = useState<string[]>([]);

  useEffect(() => {
    const result: string[] = [];
    Children.forEach(children, child => {
      if (isValidElement(child)) {
        if (child.type === Style) {
          const { children, ...attrs } = child.props as StyleProps;
          result.push(`<style${serializeAttributes(attrs)}>${children?.trim() || ''}</style>`);
        } else if (child.type === Script) {
          const { children, ...attrs } = child.props as ScriptProps;
          result.push(`<script${serializeAttributes(attrs)}>${children?.trim() || ''}</script>`);
        } else if (child.type === Link) {
          const attrs = child.props as LinkProps;
          result.push(`<link${serializeAttributes(attrs)} />`);
        }
      }
    });

    setInjections(result);
  }, [children]);

  return injections;
}
