// Makes an input field deliberately confusing:
// - Display shows dots/bullets instead of real characters
// - Each keystroke randomly shows 0, 1, or 2 dots
// - The REAL value is tracked internally for validation

import { useCallback, useRef, useState } from "react";

export const useConfusingInput = () => {
  const realValue = useRef("");
  const [display, setDisplay] = useState("");

  const randomDots = (): string => {
    const r = Math.random();
    if (r < 0.25) return "";          // 25% — no dot appears
    if (r < 0.55) return "•";         // 30% — one dot
    return "••";                       // 45% — two dots
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newLen = e.target.value.length;
      const oldLen = realValue.current.length;

      if (newLen > oldLen) {
        // Character(s) added — figure out what was typed
        // We compare lengths because the display value is dots, not real chars
        const typed = e.target.value.slice(display.length);
        realValue.current += typed;
        setDisplay((prev) => prev + randomDots());
      } else if (newLen < oldLen) {
        // Backspace
        const diff = oldLen - newLen;
        realValue.current = realValue.current.slice(0, -diff);
        setDisplay((prev) => prev.slice(0, Math.max(0, prev.length - 1)));
      }
    },
    [display],
  );

  const reset = useCallback(() => {
    realValue.current = "";
    setDisplay("");
  }, []);

  return {
    /** The value to bind to the input's `value` */
    display,
    /** The real (hidden) string the user actually typed */
    getRealValue: () => realValue.current,
    /** onChange handler to attach to the input */
    handleChange,
    /** Reset both display and real value */
    reset,
  };
};
