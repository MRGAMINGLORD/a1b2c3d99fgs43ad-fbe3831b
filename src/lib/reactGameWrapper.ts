// Detect whether a pasted snippet looks like a React/JSX component rather
// than a full HTML document, and wrap it in a self-contained HTML shell that
// loads React + ReactDOM + Babel from a CDN so it can run inside the same
// iframe used for built-in HTML games.
//
// The wrapper purposefully strips ES module `import` / `export` lines because
// the in-browser Babel standalone build cannot resolve bare module specifiers.
// React, ReactDOM and useState/useEffect/etc. are exposed on globalThis so
// pasted code can use them without explicit imports.

const HTML_DOC_RE = /<\s*(!doctype|html|head|body)\b/i;

const REACT_HINTS = [
  /\bimport\s+[^;]*from\s+['"]react['"]/i,
  /\bfrom\s+['"]react-dom\b/i,
  /\bexport\s+default\b/,
  /\breact\.createelement\b/i,
  /\bReactDOM\b/,
  /\buseState\s*\(/,
  /\buseEffect\s*\(/,
  /\b(function|const)\s+[A-Z][A-Za-z0-9_]*\s*[=(]/, // PascalCase component
];

const JSX_HINT = /<\s*[A-Za-z][A-Za-z0-9]*[^>]*>[\s\S]*<\s*\//;

/**
 * Best-effort heuristic: returns true when the snippet looks like React/JSX
 * source and NOT a complete HTML document.
 */
export const looksLikeReact = (source: string): boolean => {
  const s = source.trim();
  if (!s) return false;
  if (HTML_DOC_RE.test(s)) return false;
  if (REACT_HINTS.some((re) => re.test(s))) return true;
  // Treat any top-level JSX tag as React-ish too.
  return JSX_HINT.test(s);
};

/**
 * Strip ES module syntax that the in-browser Babel standalone cannot handle,
 * and try to surface the default export as a global `__GAME_ROOT` so the
 * runtime shell can mount it.
 */
const sanitizeReactSource = (source: string): string => {
  let code = source;

  // Drop all import statements (single + multi-line).
  code = code.replace(/^\s*import\s+[^;]*;?\s*$/gm, "");
  code = code.replace(/^\s*import\s*\(.+?\)\s*;?\s*$/gm, "");

  // Capture and rewrite default exports into a global assignment so the shell
  // can find the root component without bundler-style exports.
  code = code.replace(
    /export\s+default\s+function\s+([A-Za-z0-9_$]+)/,
    "globalThis.__GAME_ROOT = function $1",
  );
  code = code.replace(
    /export\s+default\s+class\s+([A-Za-z0-9_$]+)/,
    "globalThis.__GAME_ROOT = class $1",
  );
  code = code.replace(/export\s+default\s+/g, "globalThis.__GAME_ROOT = ");

  // Strip any remaining named exports (`export const Foo = ...` -> `const Foo = ...`).
  code = code.replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, "$1 ");
  code = code.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "");

  return code;
};

/**
 * Build a complete HTML document around a React/JSX snippet so it renders
 * the same way a built-in HTML game does.
 */
export const wrapReactGame = (source: string): string => {
  const userCode = sanitizeReactSource(source);

  // The shell does three things in order:
  //  1. Expose React + common hooks as globals so user code doesn't need imports.
  //  2. Compile + run the user code with Babel standalone (JSX + TS syntax).
  //  3. If the user code didn't already render anything, mount whichever
  //     component it left on `globalThis.__GAME_ROOT` (or the first PascalCase
  //     function it defined) into <div id="root">.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React Game</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone@7.24.7/babel.min.js"></script>
    <style>
      html, body, #root { margin: 0; padding: 0; min-height: 100%; height: 100%; background: #0a0a0a; color: #fafafa; font-family: ui-sans-serif, system-ui, sans-serif; }
      #__game_error { position: fixed; inset: 0; padding: 24px; background: #1a0a0a; color: #fecaca; font: 13px/1.5 ui-monospace, monospace; white-space: pre-wrap; overflow: auto; display: none; z-index: 9999; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <pre id="__game_error" role="alert"></pre>
    <script>
      // Expose React APIs as globals so pasted code can use them without imports.
      window.React = window.React || {};
      const __R = window.React;
      ['useState','useEffect','useRef','useMemo','useCallback','useReducer','useContext','useLayoutEffect','createContext','Fragment','Suspense','memo','forwardRef'].forEach(function(k){ if (__R[k] && !window[k]) window[k] = __R[k]; });
      window.ReactDOM = window.ReactDOM || {};
      function __showError(err){
        var box = document.getElementById('__game_error');
        if (!box) return;
        box.textContent = (err && (err.stack || err.message)) || String(err);
        box.style.display = 'block';
        console.error(err);
      }
      window.addEventListener('error', function(e){ __showError(e.error || e.message); });
      window.addEventListener('unhandledrejection', function(e){ __showError(e.reason); });
    </script>
    <script type="text/babel" data-presets="env,react,typescript" data-type="module">
${userCode}
    </script>
    <script>
      // Give Babel a tick to compile + run, then mount whatever the user defined
      // (if they didn't already render to #root themselves).
      window.addEventListener('load', function(){
        setTimeout(function(){
          try {
            var root = document.getElementById('root');
            if (!root || root.childNodes.length > 0) return;
            var Comp = window.__GAME_ROOT;
            if (!Comp) {
              // Fall back to the first PascalCase function declared on window.
              for (var k in window) {
                if (/^[A-Z]/.test(k) && typeof window[k] === 'function' && window[k].length <= 1) {
                  Comp = window[k];
                  break;
                }
              }
            }
            if (!Comp) {
              __showError('No React component found. Make sure you export default a component, or define a PascalCase function (e.g. function Game() { ... }).');
              return;
            }
            var el = window.React.createElement(Comp);
            if (window.ReactDOM.createRoot) {
              window.ReactDOM.createRoot(root).render(el);
            } else if (window.ReactDOM.render) {
              window.ReactDOM.render(el, root);
            }
          } catch (err) {
            __showError(err);
          }
        }, 50);
      });
    </script>
  </body>
</html>`;
};

/**
 * Convenience: return ready-to-store HTML for any pasted snippet.
 * - Full HTML docs are returned untouched.
 * - React/JSX snippets are wrapped via `wrapReactGame`.
 * - Anything else is also returned untouched (treated as raw HTML fragment).
 */
export const prepareGameSource = (source: string): string => {
  if (!source.trim()) return source;
  if (looksLikeReact(source)) return wrapReactGame(source);
  return source;
};
