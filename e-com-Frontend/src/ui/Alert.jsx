import { CheckCircle, Info, Warning, WarningCircle } from "@phosphor-icons/react";

const kinds = {
  info: { icon: Info, color: "text-info" },
  success: { icon: CheckCircle, color: "text-success" },
  warning: { icon: Warning, color: "text-warning" },
  error: { icon: WarningCircle, color: "text-danger" },
};

// Inline, specific feedback shown in the page, never a browser popup.
export default function Alert({ kind = "info", title, children, action, className = "" }) {
  const { icon: Icon, color } = kinds[kind];
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border border-line bg-surface p-4 ${className}`}
    >
      <Icon size={20} weight="fill" className={`mt-0.5 shrink-0 ${color}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="body-4">{title}</p>}
        {children && <div className="body-6 text-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}
