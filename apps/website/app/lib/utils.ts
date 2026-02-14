import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isDEV = import.meta.env.DEV;

export const isSSR = import.meta.env.SSR;

export const codesparkDevImports =
  isDEV && !isSSR
    ? devModuleProxy([
        'react',
        'react/jsx-runtime',
        'react-dom/client',
        '@codespark/react',
        '@codespark/react/monaco',
        '@codespark/react/codemirror',
        '@codespark/framework',
        '@codespark/framework/markdown',
        '@codespark/framework/html',
        '@codespark/framework/react',
        '@codespark/framework/node'
      ])
    : {};

export function devModuleProxy(name: string[]): Record<string, string>;
export function devModuleProxy(name: string[]): string;
export function devModuleProxy(name: string | string[]) {
  if (typeof name === 'string') return `${location.origin}/playground/dev-proxy/${name}`;

  return name.reduce<Record<string, string>>((pre, cur) => ({ ...pre, [cur]: `${location.origin}/playground/dev-proxy/${cur}` }), {});
}

export async function encodeBase64URL(str: string): Promise<string> {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();

  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function decodeBase64URL(str: string): Promise<string | null> {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (padded.length % 4)) % 4;
    const bytes = Uint8Array.from(atob(padded + '='.repeat(padding)), c => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));

    return await new Response(stream).text();
  } catch {
    return null;
  }
}
