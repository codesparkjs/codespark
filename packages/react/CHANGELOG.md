## 1.0.9

### Bug fix 🐛

- Mark `monaco-editor` as external to reduce bundle size of dts files

## 1.0.8

### Features 🚀

- new `CodesparkBrowser` component for `@codespark/framework/node` preview

### Bug fix 🐛

- fix file icon reveal error

## 1.0.7

Update packages

## 1.0.6

Update packages

## 1.0.5

### Bug fix 🐛

- merge the same externals source

## 1.0.4

### Bug fix 🐛

- fix `preflight` fontSize style

## 1.0.3

### Bug fix 🐛

- fix release bug

## 1.0.2

### Bug fix 🐛

- remove initial imports & presets

## 1.0.1

### Features 🚀

- `CodesparkPreview`: add props `preflight`

### Bug fix 🐛

- fix `createWorkspace` source mod bug, add all files to workspace automatically
- fix Monaco editor JSX typing issue: `file://node_modules/react/jsx-runtime/index.d.ts` -> `file://node_modules/react/jsx-runtime.d.ts`
- fix Monaco editor duplicate completions
- use cache to avoid creating multiple shiki instances
- remove the default height value (it will overrides the class name) of `CodesparkPreview`

## 1.0.0

Package init