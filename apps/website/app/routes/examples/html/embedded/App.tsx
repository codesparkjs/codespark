import { html } from '@codespark/framework/html';
import { Codespark } from '@codespark/react';

export default function App() {
  return (
    <Codespark
      framework={html}
      editorHeight={400}
      orientation="horizontal"
      name="index.html"
      code={`<!DOCTYPE html>
<html>
<head>
  <style>
    h1 { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>`}
    />
  );
}
