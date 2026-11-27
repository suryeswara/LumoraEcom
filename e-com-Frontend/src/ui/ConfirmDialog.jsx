import Button from "./Button";
import Dialog from "./Dialog";

// A real in-page dialog (not a browser popup) with focus handling and a clear destructive action.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Keep it",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      dismissible={!busy}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy} data-autofocus>
            {busy ? "Working" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="body-3 text-muted">{message}</p>
    </Dialog>
  );
}
