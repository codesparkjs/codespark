import { TailwindCssCompiler } from '@codespark/compiler';
import { useRef } from 'react';

export function useTailwindCss() {
  const compilerRef = useRef<TailwindCssCompiler>(null);
  const sheetRef = useRef<HTMLStyleElement>(null);
  const styleObserverRef = useRef<MutationObserver>(null);
  const observerRef = useRef<MutationObserver>(null);

  const observeStyle = (style: HTMLStyleElement) => {
    styleObserverRef.current?.observe(style, {
      attributes: true,
      attributeFilter: ['type'],
      characterData: true,
      subtree: true,
      childList: true
    });
  };

  const rebuild = async (kind: 'full' | 'incremental') => {
    const css = await compilerRef.current?.rebuild(kind);

    if (css !== undefined && sheetRef.current) {
      sheetRef.current.textContent = css;
    }
  };

  const mount = (doc: Document) => {
    compilerRef.current ??= new TailwindCssCompiler(doc);
    sheetRef.current ??= doc.createElement('style');

    styleObserverRef.current = new MutationObserver(() => rebuild('full'));
    observerRef.current = new MutationObserver(records => {
      let full = 0;
      let incremental = 0;

      for (const record of records) {
        for (const node of record.addedNodes as Iterable<HTMLElement>) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName !== 'STYLE') continue;
          if (node.getAttribute('type') !== TailwindCssCompiler.STYLE_TYPE) continue;

          observeStyle(node as HTMLStyleElement);
          full++;
        }

        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node === sheetRef.current) continue;
          incremental++;
        }

        if (record.type === 'attributes') {
          incremental++;
        }
      }

      if (full > 0) {
        rebuild('full');
      } else if (incremental > 0) {
        rebuild('incremental');
      }
    });

    for (const style of compilerRef.current.stylesheets) {
      observeStyle(style);
    }
    observerRef.current.observe(doc, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });

    rebuild('full');
    doc.head.appendChild(sheetRef.current);
  };

  const unmount = () => {
    styleObserverRef.current?.disconnect();
    observerRef.current?.disconnect();
    sheetRef.current?.remove();
    styleObserverRef.current = null;
    observerRef.current = null;
    sheetRef.current = null;
    compilerRef.current = null;
  };

  return { mount, unmount };
}
