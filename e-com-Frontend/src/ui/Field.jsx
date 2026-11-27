import { forwardRef } from "react";
import { WarningCircle } from "@phosphor-icons/react";

export function Field({ label, htmlFor, error, hint, optional = false, className = "", children }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="title-4 text-fg">
          {label}
          {optional && <span className="caption-2 text-subtle"> (optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="caption-1 flex items-center gap-1 text-danger">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="caption-2 text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full rounded-lg border bg-raised px-3 py-2 body-3 text-fg placeholder:text-subtle transition-colors duration-300 ease-brand hover:bg-hover focus-visible:bg-page disabled:opacity-50";

function stateClass(invalid) {
  return invalid ? "border-danger" : "border-line";
}

export const Input = forwardRef(function Input({ invalid = false, className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={`${control} ${stateClass(invalid)} ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ invalid = false, className = "", children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={`${control} ${stateClass(invalid)} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ invalid = false, className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={`${control} resize-y ${stateClass(invalid)} ${className}`}
      {...props}
    />
  );
});
