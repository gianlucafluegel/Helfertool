import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export function FilterChip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-navy bg-navy text-white"
          : "border-border bg-white text-text hover:border-navy/40",
        className,
      )}
      {...props}
    />
  );
}
