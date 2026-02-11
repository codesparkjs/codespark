## 1.0.2

### Breaking change ❗️

- Framework API change:
  - `analyze(entry, files)` -> `analyze(files)`
  - `compile()` -> `compile(entry)`

### Bug fix 🐛

- `framework/react`
  - remove react specific version
- `framework/html`
  - fix entry name bug: the entry name must end with `.html` to be recognized

## 1.0.1

### Bug fix 🐛

- `framework/react`
  - Generating outputs with post-order traversal to fix dependencies resolve order. For example, a -> b, a -> c, b -> d, c -> d, old order: [a, b, d, c], new order: [d, b, c, a]

## 1.0.0

Package init