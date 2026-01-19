import type { Dep } from '_shared/types';
import { availablePresets, transform } from '@babel/standalone';
import type { FrameworkCompiler, FrameworkConfig } from '@codespark/framework';

export class VueCompiler implements FrameworkCompiler {
  private blobUrlMap = new Map<string, string>();

  compile(source: string, deps: Dep[] = []): string {
    if (deps.length > 0) {
      this.transformDepsToBlob(deps);
    }

    const sourceWithBlobs = this.transformCodeWithBlobUrls(source);
    const { template, script, scriptSetup } = this.parseSFC(sourceWithBlobs);

    let code = '';
    let setupCode = '';

    if (scriptSetup) {
      // Transform <script setup> - extract imports and declarations
      const { imports, body, returns } = this.parseScriptSetup(scriptSetup);
      setupCode = `
${imports}
const __sfc__ = {
  setup() {
    ${body}
    return { ${returns} };
  }
};
`;
    } else if (script) {
      // Regular <script> with export default
      setupCode = script.replace(/export\s+default\s*/, 'const __sfc__ = ');
    } else {
      setupCode = 'const __sfc__ = {};';
    }

    // Add template
    code = `
${setupCode}
__sfc__.template = \`${this.escapeTemplate(template)}\`;
`;

    // Append Vue mount code
    code += `
import { createApp } from 'vue';
window.__app__?.unmount();
const app = createApp(__sfc__);
window.__app__ = app;
app.mount('#root');
window.__render_complete__?.();
window.__next__?.();
`;

    // Transform TypeScript
    const { typescript } = availablePresets;
    const { code: compiled } = transform(code, {
      filename: 'App.vue.ts',
      presets: [[typescript, { isTSX: false, allExtensions: true }]]
    });

    return compiled || '';
  }

  revokeBlobUrls(): void {
    for (const url of this.blobUrlMap.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlMap.clear();
  }

  private transformDepsToBlob(deps: Dep[]) {
    for (const dep of deps) {
      if (!('code' in dep)) continue;

      if (dep.deps?.length) {
        this.transformDepsToBlob(dep.deps);
      }

      const { typescript } = availablePresets;
      const { code: compiled } = transform(dep.code, {
        filename: `${dep.name}.ts`,
        presets: [[typescript, { isTSX: false, allExtensions: true }]]
      });

      const blob = new Blob([compiled || ''], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      if (dep.alias) {
        this.blobUrlMap.set(dep.alias, blobUrl);
      }
    }
  }

  private transformCodeWithBlobUrls(code: string): string {
    if (this.blobUrlMap.size === 0) {
      return code;
    }

    let result = code;
    for (const [alias, blobUrl] of this.blobUrlMap) {
      const importRegex = new RegExp(`from\\s+['"]${this.escapeRegex(alias)}['"]`, 'g');
      result = result.replace(importRegex, `from '${blobUrl}'`);
    }
    return result;
  }

  private parseSFC(source: string): { template: string; script: string; scriptSetup: string; styles: string[] } {
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);
    const scriptSetupMatch = source.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
    const scriptMatch = source.match(/<script(?!\s+setup)[^>]*>([\s\S]*?)<\/script>/);
    const styleMatches = source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g);

    return {
      template: templateMatch?.[1]?.trim() || '',
      script: scriptMatch?.[1]?.trim() || '',
      scriptSetup: scriptSetupMatch?.[1]?.trim() || '',
      styles: Array.from(styleMatches).map(m => m[1].trim())
    };
  }

  private parseScriptSetup(scriptSetup: string): { imports: string; body: string; returns: string } {
    const lines = scriptSetup.split('\n');
    const imports: string[] = [];
    const body: string[] = [];
    const declarations: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ')) {
        imports.push(line);
      } else {
        body.push(line);
        // Extract declarations
        const constMatch = trimmed.match(/^(?:const|let|var)\s+(\w+)/);
        const funcMatch = trimmed.match(/^function\s+(\w+)/);
        if (constMatch) declarations.push(constMatch[1]);
        if (funcMatch) declarations.push(funcMatch[1]);
      }
    }

    return {
      imports: imports.join('\n'),
      body: body.join('\n'),
      returns: declarations.join(', ')
    };
  }

  private escapeTemplate(template: string): string {
    return template.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const vue: FrameworkConfig = {
  name: 'vue',
  compiler: () => new VueCompiler(),
  imports: {
    vue: 'https://esm.sh/vue@3.4.0/dist/vue.esm-browser.js'
  }
};
