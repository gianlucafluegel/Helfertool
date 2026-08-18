import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

const ACTIVE_CLASSES = {
  dark: "border-navy bg-navy text-white",
  blue: "border-[#3b6ff0] bg-[#3b6ff0] text-white",
};

export function FilterChipLink({
  active,
  activeVariant = "dark",
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  active?: boolean;
  activeVariant?: "dark" | "blue";
  icon?: ReactNode;
}) {
  return (
    <Link
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active ? ACTIVE_CLASSES[activeVariant] : "border-border bg-white text-text hover:border-navy/40",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
