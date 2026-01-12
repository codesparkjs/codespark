import { generateDtsBundle } from 'dts-bundle-generator';

const dtsCache = new Map<string, string>();

const excludedLibraries = ['react', 'react-dom'];

export const generateDts = (filePath: string, externals: string[]) => {
  if (dtsCache.has(filePath)) {
    return dtsCache.get(filePath)!;
  }

  const [result] = generateDtsBundle([
    {
      filePath,
      libraries: { inlinedLibraries: externals.filter(lib => !excludedLibraries.includes(lib)) },
      output: { noBanner: true, exportReferencedTypes: true, inlineDeclareGlobals: false }
    }
  ]);
  dtsCache.set(filePath, result);

  return result;
};
