// Reusable "Exit" trigger that shows a confirmation dialog before navigating
// the user away from a running game or education screen, so an accidental
// click can't wipe their progress.

import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
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
  confirmLabel?: string;
  cancelLabel?: string;
  children: ReactNode;
}

export const ConfirmExitLink = ({
  to,
  className,
  ariaLabel,
  title = "Leave this screen?",
  description = "Your current session may not be saved. Are you sure you want to exit?",
  confirmLabel = "Yes, exit",
  cancelLabel = "Stay",
  children,
}: ConfirmExitLinkProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false);
                navigate(to);
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
