import { InputHTMLAttributes, ReactNode } from "react";

export function FormField({
  label,
  name,
  children,
  ...inputProps
}: {
  label: string;
  name: string;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-text">
        {label}
      </label>
      {children ?? (
        <input
          id={name}
          name={name}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          {...inputProps}
        />
      )}
    </div>
  );
}
