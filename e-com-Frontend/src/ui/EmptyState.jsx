// A composed view for empty lists, never a blank panel.
export default function EmptyState({ icon: Icon, title, children, actions }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface px-6 py-16 text-center">
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-xl bg-raised text-muted">
          <Icon size={24} aria-hidden="true" />
        </span>
      )}
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="heading-6">{title}</h2>
        {children && <p className="body-3 text-muted">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
