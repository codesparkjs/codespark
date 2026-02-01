import { OutputType } from '../loaders/types';
import type { OutputItem } from '../registry';

export function compile(outputs: Map<OutputType, OutputItem[]>) {
  const assets = outputs.get(OutputType.Asset) ?? [];

  return assets.map(a => a.content).join('\n');
}
