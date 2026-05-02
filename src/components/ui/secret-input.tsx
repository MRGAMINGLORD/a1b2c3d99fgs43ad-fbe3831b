// SecretInput — hides what the user typed AND hides the length.
// Each keypress (other than Backspace/Delete) renders a random number of
// dots: 0, 1, or 2. Backspace/Delete removes exactly the dots that were
// rendered for the last typed character, so the visible dot count goes
// back to what it was before that keystroke.
//
// The actual typed value is preserved and reported via `onChange` as a
// normal string, so existing password-checking code keeps working.

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SecretInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

const randDots = () => Math.floor(Math.random() * 3); // 0, 1, or 2

export const SecretInput = React.forwardRef<HTMLInputElement, SecretInputProps>(
  ({ value, onChange, className, placeholder, onKeyDown, ...props }, ref) => {
    // dots[i] = number of dots rendered for character i of `value`
    const [dots, setDots] = React.useState<number[]>(() =>
      Array.from({ length: value.length }, () => 1),
    );

    // Keep dots array length in sync if `value` is reset externally (e.g. cleared on submit).
    React.useEffect(() => {
      setDots((prev) => {
        if (prev.length === value.length) return prev;
        if (value.length === 0) return [];
        if (value.length < prev.length) return prev.slice(0, value.length);
        // External growth (rare) — pad with 1 dot each.
        return [...prev, ...Array.from({ length: value.length - prev.length }, () => 1)];
      });
    }, [value.length]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      // Allow tab / arrows / modifiers to pass through.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        if (value.length === 0) return;
        onChange(value.slice(0, -1));
        setDots((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key === "Delete") {
        e.preventDefault();
        if (value.length === 0) return;
        onChange(value.slice(0, -1));
        setDots((prev) => prev.slice(0, -1));
        return;
      }
      // Single printable character.
      if (e.key.length === 1) {
        e.preventDefault();
        onChange(value + e.key);
        setDots((prev) => [...prev, randDots()]);
      }
      // Any other key (Enter, Shift, etc.) falls through.
    };

    // Block paste / drop / cut / native input so length never leaks.
    const swallow = (e: React.SyntheticEvent) => {
      e.preventDefault();
    };

    const totalDots = dots.reduce((a, b) => a + b, 0);

    return (
      <div className={cn("relative", className)}>
        <input
          ref={ref}
          // Use text type but render nothing visible; we draw our own dots.
          type="text"
          value=""
          onChange={() => {
            /* controlled by keydown */
          }}
          onKeyDown={handleKeyDown}
          onPaste={swallow}
          onCut={swallow}
          onDrop={swallow}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="absolute inset-0 h-full w-full cursor-text rounded-md bg-transparent px-3 py-2 text-transparent caret-transparent outline-none"
          aria-label={placeholder}
          {...props}
        />
        <div
          className={cn(
            "pointer-events-none flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background md:text-sm",
            "tracking-[0.25em]",
          )}
        >
          {totalDots === 0 ? (
            <span className="text-muted-foreground">{placeholder ?? ""}</span>
          ) : (
            <span className="text-foreground">{"•".repeat(totalDots)}</span>
          )}
        </div>
      </div>
    );
  },
);
SecretInput.displayName = "SecretInput";
