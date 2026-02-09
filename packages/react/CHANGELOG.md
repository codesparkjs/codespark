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