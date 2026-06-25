// Reusable "Exit" trigger that shows a confirmation dialog before navigating
// the user away from a running game or education screen.
//
// Three options:
//   - Cancel             → closes the menu, stays in the game
//   - Leave              → navigates away immediately, no save
//   - Save Now And Leave → broadcasts a save request to the running game,
//                          then navigates away once it's had a beat to write.

import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmExitLinkProps {
  to: string;
  className?: string;
  ariaLabel?: string;
  title?: string;
  description?: string;
  leaveLabel?: string;
  saveAndLeaveLabel?: string;
  cancelLabel?: string;
  children: ReactNode;
}

const broadcastSaveNow = () => {
  try {
    const bc = new BroadcastChannel("apocalypse-waffle");
    bc.postMessage({ type: "save-now" });
    bc.close();
  } catch {
    // BroadcastChannel unavailable — games that auto-save on unmount still cover us.
  }
};

export const ConfirmExitLink = ({
  to,
  className,
  ariaLabel,
  title = "Leave this screen?",
  description = "Choose how you want to exit. Saving writes your current progress to bunker storage so the Save Terminal can export it.",
  leaveLabel = "Leave",
  saveAndLeaveLabel = "Save Now And Leave",
  cancelLabel = "Cancel",
  children,
}: ConfirmExitLinkProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLeave = () => {
    setOpen(false);
    navigate(to);
  };

  const handleSaveAndLeave = () => {
    broadcastSaveNow();
    // Give any listening game a beat to commit to localStorage before we unmount it.
    window.setTimeout(() => {
      setOpen(false);
      navigate(to);
    }, 250);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="sm:mr-auto">
              {cancelLabel}
            </AlertDialogCancel>
            <button
              type="button"
              onClick={handleLeave}
              className="inline-flex h-10 items-center justify-center rounded-md border border-destructive/60 bg-background px-4 font-display text-xs uppercase tracking-wider text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              {leaveLabel}
            </button>
            <button
              type="button"
              onClick={handleSaveAndLeave}
              className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 font-display text-xs uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/80"
            >
              {saveAndLeaveLabel}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
