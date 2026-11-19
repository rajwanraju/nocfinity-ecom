import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "h-11 w-full min-w-0 rounded-full border border-input bg-transparent px-4 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none",
        "selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        props["aria-invalid"] && "border-destructive ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
