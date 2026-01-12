import { Children, isValidElement, type ReactNode, useEffect, useState } from 'react';

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

export function useInjections(children: ReactNode) {
  const [injections, setInjections] = useState<string[]>([]);

  const getAttrStr = <T extends object>(attrs: T) => {
    return Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
  };

  useEffect(() => {
    const result: string[] = [];
    Children.forEach(children, child => {
      if (isValidElement(child)) {
        if (child.type === Style) {
          const { children, ...attrs } = child.props as StyleProps;
          const attrStr = getAttrStr(attrs);
          result.push(`<style${attrStr ? ` ${attrStr}` : ''}>${children?.trim() || ''}</style>`);
        } else if (child.type === Script) {
          const { children, ...attrs } = child.props as ScriptProps;
          const attrStr = getAttrStr(attrs);
          result.push(`<script${attrStr ? ` ${attrStr}` : ''}>${children?.trim() || ''}</script>`);
        }
      }
    });

    setInjections(result);
  }, [children]);

  return injections;
}
