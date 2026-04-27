// Detect whether a pasted snippet looks like a React/JSX component rather
// than a full HTML document, and wrap it in a self-contained HTML shell that
// loads React + ReactDOM + Babel from a CDN so it can run inside the same
// iframe used for built-in HTML games.
//
// The wrapper purposefully strips ES module `import` / `export` lines because
// the in-browser Babel standalone build cannot resolve bare module specifiers.
// React, ReactDOM and useState/useEffect/etc. are exposed on globalThis so
// pasted code can use them without explicit imports. We also shim a handful
// of common libraries (lucide-react, framer-motion, clsx) so Gemini-style
// snippets render instead of crashing on missing imports.

const HTML_DOC_RE = /<\s*(!doctype|html|head|body)\b/i;

// Strong signals that this is React/JSX source, not an HTML fragment.
const STRONG_REACT_HINTS: RegExp[] = [
  /\bimport\s+[^;]*\bfrom\s+['"]react['"]/i,
  /\bimport\s+[^;]*\bfrom\s+['"]react-dom(\/client)?['"]/i,
  /\bimport\s+[^;]*\bfrom\s+['"]lucide-react['"]/i,
  /\bimport\s+[^;]*\bfrom\s+['"]framer-motion['"]/i,
  /\bexport\s+default\s+(function|class|\(|[A-Z])/,
  /\bReact\.createElement\s*\(/,
  /\bReactDOM\.(render|createRoot)\s*\(/,
  /\buse(State|Effect|Ref|Memo|Callback|Reducer|Context|LayoutEffect)\s*\(/,
  // PascalCase function/const component declaration
  /\b(function|const|let|var)\s+[A-Z][A-Za-z0-9_]*\s*[=(]/,
  // className= is React-specific (HTML uses class=)
  /\bclassName\s*=\s*["'{]/,
];

// JSX-ish tag patterns. Self-closing `<Foo />`, fragment `<>`, or PascalCase tag.
const JSX_TAG_HINTS: RegExp[] = [
  /<\s*[A-Z][A-Za-z0-9]*[\s/>]/, // <Component
  /<\s*\/\s*[A-Z][A-Za-z0-9]*\s*>/, // </Component>
  /<\s*>\s*[\s\S]*?<\s*\/\s*>/, // <>...</>
  /\/\s*>/, // self-closing tag
  /\{\s*[A-Za-z_$][\w$]*\s*\}/, // {expression} interpolation inside JSX
];

const looksLikeHtmlDoc = (s: string) => HTML_DOC_RE.test(s);

/**
 * Best-effort heuristic: returns true when the snippet looks like React/JSX
 * source and NOT a complete HTML document. Multi-signal scoring so a stray
 * `<div>` in plain HTML doesn't get misclassified, and a real component
 * without imports still gets caught.
 */
export const looksLikeReact = (source: string): boolean => {
  const s = source.trim();
  if (!s) return false;
  if (looksLikeHtmlDoc(s)) return false;

  // Any single strong hint is enough.
  if (STRONG_REACT_HINTS.some((re) => re.test(s))) return true;

  // Otherwise require at least 2 JSX-ish signals to avoid false positives
  // on plain HTML fragments.
  const jsxScore = JSX_TAG_HINTS.reduce(
    (n, re) => n + (re.test(s) ? 1 : 0),
    0,
  );
  return jsxScore >= 2;
};

/**
 * Track which common npm packages were imported so the runtime shim can
 * resolve them to globals. We only support a small allowlist; everything
 * else is stripped and replaced with an empty object so the code at least
 * parses and runs.
 */
const KNOWN_GLOBALS: Record<string, string> = {
  react: "React",
  "react-dom": "ReactDOM",
  "react-dom/client": "ReactDOM",
  "lucide-react": "LucideReact",
  "framer-motion": "FramerMotion",
  clsx: "clsx",
  classnames: "classnames",
};

/**
 * Strip ES module syntax that the in-browser Babel standalone cannot handle,
 * and rewrite imports into destructuring from known globals. Also surfaces
 * the default export as a global `__GAME_ROOT` so the runtime shell can
 * mount it.
 */
const sanitizeReactSource = (source: string): string => {
  let code = source;

  // Replace `import X from 'pkg'` and `import { a, b } from 'pkg'` with
  // destructuring/aliasing from the matching global. Unknown packages get
  // a harmless empty-object fallback so the rest of the file still runs.
  code = code.replace(
    /^[ \t]*import\s+([\s\S]+?)\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm,
    (_match, what: string, pkg: string) => {
      const global = KNOWN_GLOBALS[pkg];
      const src = global ? `globalThis.${global}` : "({})";
      const cleaned = what.trim();

      // `import Foo` => `const Foo = src.default ?? src;`
      if (/^[A-Za-z_$][\w$]*$/.test(cleaned)) {
        return `const ${cleaned} = (${src} && (${src}.default ?? ${src})) || {};`;
      }
      // `import * as Foo` => `const Foo = src;`
      const ns = cleaned.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (ns) return `const ${ns[1]} = ${src};`;
      // `import Foo, { a, b }` => default + named
      const mixed = cleaned.match(/^([A-Za-z_$][\w$]*)\s*,\s*\{([\s\S]*)\}$/);
      if (mixed) {
        const def = mixed[1];
        const named = mixed[2].trim();
        return `const ${def} = (${src} && (${src}.default ?? ${src})) || {}; const { ${named} } = ${src} || {};`;
      }
      // `import { a, b as c }` => `const { a, b: c } = src;`
      const named = cleaned.match(/^\{([\s\S]*)\}$/);
      if (named) {
        const list = named[1]
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => p.replace(/\s+as\s+/, ": "))
          .join(", ");
        return `const { ${list} } = ${src} || {};`;
      }
      return ""; // give up — strip
    },
  );

  // Bare `import 'foo';` (side-effect imports) — drop entirely.
  code = code.replace(/^[ \t]*import\s+['"][^'"]+['"];?[ \t]*$/gm, "");
  // Dynamic `import(...)` — drop.
  code = code.replace(/^[ \t]*import\s*\([^)]*\)\s*;?[ \t]*$/gm, "");

  // Default exports → assign to a known global so the shell can mount it.
  code = code.replace(
    /export\s+default\s+function\s+([A-Za-z0-9_$]+)/,
    "globalThis.__GAME_ROOT = function $1",
  );
  code = code.replace(
    /export\s+default\s+class\s+([A-Za-z0-9_$]+)/,
    "globalThis.__GAME_ROOT = class $1",
  );
  code = code.replace(/export\s+default\s+/g, "globalThis.__GAME_ROOT = ");

  // Strip remaining named exports.
  code = code.replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, "$1 ");
  code = code.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "");

  return code;
};

/**
 * Build a complete HTML document around a React/JSX snippet so it renders
 * the same way a built-in HTML game does. Includes Tailwind via CDN (used
 * by most Gemini-canvas snippets), lucide-react UMD, and framer-motion UMD
 * so common imports just work.
 */
export const wrapReactGame = (source: string): string => {
  const userCode = sanitizeReactSource(source);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React Game</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/lucide-react@0.460.0/dist/umd/lucide-react.min.js"></script>
    <script crossorigin src="https://unpkg.com/framer-motion@11.11.17/dist/framer-motion.js"></script>
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
      var __R = window.React;
      ['useState','useEffect','useRef','useMemo','useCallback','useReducer','useContext','useLayoutEffect','createContext','Fragment','Suspense','memo','forwardRef'].forEach(function(k){ if (__R[k] && !window[k]) window[k] = __R[k]; });
      window.ReactDOM = window.ReactDOM || {};
      // Normalize lucide-react UMD bundle name (some versions expose 'lucide' instead).
      window.LucideReact = window.LucideReact || window.lucideReact || window.lucide || {};
      window.FramerMotion = window.FramerMotion || window.framerMotion || {};
      window.clsx = window.clsx || function(){
        var out = [];
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (!a) continue;
          if (typeof a === 'string' || typeof a === 'number') out.push(a);
          else if (Array.isArray(a)) out.push(window.clsx.apply(null, a));
          else if (typeof a === 'object') {
            for (var k in a) if (a[k]) out.push(k);
          }
        }
        return out.join(' ');
      };
      window.classnames = window.classnames || window.clsx;
      function __serializeError(err){
        if (!err) return 'Unknown error';
        if (typeof err === 'string') return err;
        return (err.stack || err.message || String(err));
      }
      function __postError(kind, err){
        try {
          parent.postMessage({
            __waffleGameError: true,
            kind: kind,
            message: __serializeError(err),
            time: Date.now(),
          }, '*');
        } catch (_) {}
      }
      function __showError(err){
        var box = document.getElementById('__game_error');
        if (box) {
          box.textContent = __serializeError(err);
          box.style.display = 'block';
        }
        console.error(err);
        __postError('runtime', err);
      }
      window.addEventListener('error', function(e){ __showError(e.error || e.message); });
      window.addEventListener('unhandledrejection', function(e){ __showError(e.reason); });
      // Forward console.error too so React's own warnings/errors surface.
      (function(){
        var origErr = console.error.bind(console);
        console.error = function(){
          try {
            var parts = [];
            for (var i = 0; i < arguments.length; i++) {
              var a = arguments[i];
              parts.push(typeof a === 'string' ? a : __serializeError(a));
            }
            __postError('console', parts.join(' '));
          } catch (_) {}
          return origErr.apply(console, arguments);
        };
      })();
    </script>
    <script type="text/babel" data-presets="env,react,typescript">
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
                try {
                  if (/^[A-Z]/.test(k) && typeof window[k] === 'function' && window[k].length <= 1) {
                    Comp = window[k];
                    break;
                  }
                } catch (_) {}
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
        }, 100);
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
