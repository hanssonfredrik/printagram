/// <reference types="vite/client" />

declare const __API_MODE__: 'mock' | 'real';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
