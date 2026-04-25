import "@testing-library/jest-dom";

// Some test files run in the `node` environment (e.g. backend / RLS contract
// tests) where `window` doesn't exist. Guard the polyfill so setup is safe
// in both jsdom and node.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
