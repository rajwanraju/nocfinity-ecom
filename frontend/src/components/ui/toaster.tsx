"use client";

import { Toaster as SonnerToaster } from "sonner";

/** FR-ADMIN-9: one toast surface for the whole app. */
export function Toaster() {
  return (
    <SonnerToaster
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-border bg-background text-foreground shadow-lg",
        },
      }}
    />
  );
}

export { toast } from "sonner";
