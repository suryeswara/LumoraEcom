import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import Button from "./Button";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

// Accessible modal: focus moves in, Tab stays inside, Escape closes, focus returns to the trigger.
export default function Dialog({ open, onClose, title, description, children, footer, size = "md", dismissible = true }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const first = panel?.querySelector("[data-autofocus]") || panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape" && dismissible) {
        event.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (event.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)];
        if (items.length === 0) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="animate-fade-in absolute inset-0 bg-page/80 backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`animate-rise-in relative flex max-h-full w-full ${sizes[size]} flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl outline-none`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="heading-6">
              {title}
            </h2>
            {description && <p className="body-6 text-muted">{description}</p>}
          </div>
          {dismissible && (
            <Button variant="ghost" icon onClick={onClose} aria-label="Close dialog" className="-mr-2 -mt-2">
              <X size={20} />
            </Button>
          )}
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
