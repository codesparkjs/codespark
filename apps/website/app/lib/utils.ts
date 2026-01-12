import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isDEV = import.meta.env.DEV;

export const isSSR = import.meta.env.SSR;

export function devModuleProxy(name: string[]): Record<string, string>;
export function devModuleProxy(name: string[]): string;
export function devModuleProxy(name: string | string[]) {
  if (typeof name === 'string') return `${location.origin}/playground/dev-proxy/${name}`;

  return name.reduce<Record<string, string>>((pre, cur) => ({ ...pre, [cur]: `${location.origin}/playground/dev-proxy/${cur}` }), {});
}
