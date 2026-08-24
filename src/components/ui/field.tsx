import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-ring disabled:opacity-50";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, "h-10", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(base, "resize-none py-2.5 leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(base, "h-10 cursor-pointer appearance-none pr-8", className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 0.5rem center",
      backgroundSize: "1rem",
    }}
    {...props}
  />
));
Select.displayName = "Select";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}
