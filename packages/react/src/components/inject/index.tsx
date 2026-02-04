import { Children, isValidElement, type ReactNode, useEffect, useState } from 'react';

import { serializeAttributes } from '@/lib/utils';

export interface StyleProps extends Omit<React.StyleHTMLAttributes<HTMLStyleElement>, 'children'> {
  children?: string;
}

/**
 * Style - Injects custom CSS styles into the preview iframe.
 *
 * A declarative component for adding inline styles to the sandboxed preview.
 * Renders nothing in the React tree but injects a `<style>` tag into the iframe.
 *
 * @example
 * ```tsx
 * <CodesparkPreview>
 *   <Style>{`.custom { color: red; }`}</Style>
 * </CodesparkPreview>
 * ```
 */
export function Style(_props: StyleProps) {
  return null;
}

export interface ScriptProps extends Omit<React.ScriptHTMLAttributes<HTMLScriptElement>, 'children'> {
  children?: string;
}

/**
 * Script - Injects custom JavaScript into the preview iframe.
 *
 * A declarative component for adding inline or external scripts to the sandboxed preview.
 * Renders nothing in the React tree but injects a `<script>` tag into the iframe.
 *
 * @example
 * ```tsx
 * // Inline script
 * <CodesparkPreview>
 *   <Script>{`console.log('Hello from preview');`}</Script>
 * </CodesparkPreview>
 *
 * // External script
 * <CodesparkPreview>
 *   <Script src="https://example.com/script.js" />
 * </CodesparkPreview>
 * ```
 */
export function Script(_props: ScriptProps) {
  return null;
}

export interface LinkProps extends React.LinkHTMLAttributes<HTMLLinkElement> {}

/**
 * Link - Injects external resources into the preview iframe.
 *
 * A declarative component for adding `<link>` tags to the sandboxed preview.
 * Commonly used for external stylesheets, fonts, or other linked resources.
 * Renders nothing in the React tree but injects a `<link>` tag into the iframe.
 *
 * @example
 * ```tsx
 * // External stylesheet
 * <CodesparkPreview>
 *   <Link rel="stylesheet" href="https://example.com/styles.css" />
 * </CodesparkPreview>
 *
 * // Google Fonts
 * <CodesparkPreview>
 *   <Link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter" />
 * </CodesparkPreview>
 * ```
 */
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
