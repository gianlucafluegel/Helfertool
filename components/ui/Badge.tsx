import { HTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "open" | "filled" | "helfer" | "funktionaer" | "neutral";

const VARIANT_CLASSES: Record<Variant, string> = {
  open: "bg-status-open-bg text-status-open-text",
  filled: "bg-status-filled-bg text-status-filled-text",
  helfer: "bg-tag-helfer-bg text-tag-helfer-text",
  funktionaer: "bg-tag-funktionaer-bg text-tag-funktionaer-text",
  neutral: "bg-page-bg text-muted",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
