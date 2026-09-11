import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "danger" | "dark-gray" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gold text-navy font-semibold hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-white text-text border border-border hover:bg-page-bg disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-status-open-text text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
  "dark-gray":
    "bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "bg-transparent text-text hover:bg-page-bg disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
