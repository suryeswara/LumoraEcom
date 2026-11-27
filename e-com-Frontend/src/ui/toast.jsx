import { useSyncExternalStore } from "react";
import { CheckCircle, Info, Warning, WarningCircle, X } from "@phosphor-icons/react";

// Tiny notification store: toast.success("Saved"), toast.error("Failed"), toast.info(...), toast.warning(...)
let items = [];
let nextId = 1;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function dismiss(id) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function push(type, message) {
  const id = nextId++;
  items = [...items, { id, type, message }].slice(-4);
  emit();
  setTimeout(() => dismiss(id), 4500);
  return id;
}

export const toast = {
  success: (message) => push("success", message),
  error: (message) => push("error", message),
  info: (message) => push("info", message),
  warning: (message) => push("warning", message),
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => items;

const icons = {
  success: { Icon: CheckCircle, color: "text-success" },
  error: { Icon: WarningCircle, color: "text-danger" },
  info: { Icon: Info, color: "text-info" },
  warning: { Icon: Warning, color: "text-warning" },
};

export function Toaster() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-60 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
    >
      {list.map(({ id, type, message }) => {
        const { Icon, color } = icons[type];
        return (
          <div
            key={id}
            className="animate-rise-in pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-raised p-3 shadow-lg"
          >
            <Icon size={20} weight="fill" className={`mt-0.5 shrink-0 ${color}`} aria-hidden="true" />
            <p className="body-5 min-w-0 flex-1 text-fg">{message}</p>
            <button
              type="button"
              onClick={() => dismiss(id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-subtle transition-colors duration-300 ease-brand hover:text-fg"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
