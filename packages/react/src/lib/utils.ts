import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function constructESMUrl(config: { pkg: string; version?: string; deps?: string[]; exports?: string[]; standalone?: boolean; bundle?: boolean }) {
  const { pkg, version, deps, exports, standalone, bundle } = config;
  const params = new URLSearchParams();

  if (deps?.length) {
    params.set('deps', deps.join(','));
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

  const slashIndex = pkg.indexOf('/');
  const pkgName = slashIndex > -1 ? pkg.slice(0, slashIndex) : pkg;
  const subpath = slashIndex > -1 ? pkg.slice(slashIndex) : '';

  const base = version ? `https://esm.sh/${pkgName}@${version}${subpath}` : `https://esm.sh/${pkg}`;
  const query = params.toString();

  return query ? `${base}?${query}` : base;
}

export function generateId(prefix?: string) {
  const random = Math.random().toString(36).slice(2, 10);

  return prefix ? `${prefix}-${random}` : random;
}
