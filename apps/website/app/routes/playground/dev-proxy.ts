import type { Route } from './+types/dev-proxy';

export async function loader({ params }: Route.ActionArgs) {
  const headers = { 'Content-Type': 'application/javascript' };

  if (params['*'] === 'react') {
    return new Response(
      `import React from "/@id/react";\nexport const { useState, useEffect, useRef, useCallback, useMemo, useContext, useReducer, useLayoutEffect, useId, useSyncExternalStore, useTransition, useDeferredValue, useImperativeHandle, useDebugValue, createContext, createElement, cloneElement, isValidElement, Children, Fragment, StrictMode, Suspense, lazy, memo, forwardRef, createRef, Component, PureComponent, startTransition } = React;\nexport default React;`,
      { headers }
    );
  }

  if (params['*'] === 'react-dom/client') {
    return new Response(`import "/@id/react-dom";\nimport ReactDOM from "/@id/react-dom/client";\nexport const { createRoot, hydrateRoot } = ReactDOM;\nexport default ReactDOM;`, { headers });
  }

  if (params['*'] === 'react/jsx-runtime') {
    return new Response(`import JSXRuntime from "/@id/react/jsx-runtime";\nexport const { jsx, jsxs, jsxDEV, Fragment } = JSXRuntime;\nexport default JSXRuntime;`, { headers });
  }

  return new Response(`export * from "/@id/${params['*']}";`, { headers });
}
