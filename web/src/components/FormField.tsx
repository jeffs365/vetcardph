import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, required = false, hint, error, children }: FormFieldProps) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p> : null}
    </label>
  );
}
