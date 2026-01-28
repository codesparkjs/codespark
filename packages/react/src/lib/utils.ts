import { type ClassValue, clsx } from 'clsx';
import { useCallback, useState } from 'react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function constructESMUrl(config: { pkg: string; version?: string; deps?: string[]; external?: string[]; exports?: string[]; standalone?: boolean; bundle?: boolean }) {
  const { pkg, version, deps, external, exports, standalone, bundle } = config;
  const params = new URLSearchParams();

  if (deps?.length) {
    params.set('deps', deps.join(','));
  }
  if (external?.length) {
    params.set('external', external.join(','));
  }
  if (exports?.length) {
    params.set('exports', exports.join(','));
  }
  if (standalone) {
    params.set('standalone', '');
  }
  if (bundle) {
    params.set('bundle', '');
  }

  const isUrl = pkg.startsWith('http://') || pkg.startsWith('https://');
  let base: string;

  if (isUrl) {
    base = pkg;
  } else {
    const slashIndex = pkg.indexOf('/');
    const pkgName = slashIndex > -1 ? pkg.slice(0, slashIndex) : pkg;
    const subpath = slashIndex > -1 ? pkg.slice(slashIndex) : '';
    base = version ? `https://esm.sh/${pkgName}@${version}${subpath}` : `https://esm.sh/${pkg}`;
  }
  const query = params.toString();

  return query ? `${base}?${query}` : base;
}

export function useCopyToClipboard(timeout = 2000) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), timeout);
    },
    [timeout]
  );

  return { copyToClipboard, isCopied };
}

export function getLanguageFromFile(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', css: 'css', json: 'json', html: 'html', md: 'markdown' };

  return ext ? langMap[ext] : void 0;
}
