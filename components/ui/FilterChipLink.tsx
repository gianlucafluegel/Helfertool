import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps } from "react";

export function FilterChipLink({
  active,
  className,
  ...props
}: ComponentProps<typeof Link> & { active?: boolean }) {
  return (
    <Link
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
