// jsdom lacks a few browser APIs the screens touch indirectly.
if (!('scrollTo' in window) || typeof window.scrollTo !== 'function') {
  Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true });
}
if (!('createObjectURL' in URL)) {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock', writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, writable: true });
}
if (!('clipboard' in navigator)) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: async () => undefined },
    configurable: true,
  });
}
