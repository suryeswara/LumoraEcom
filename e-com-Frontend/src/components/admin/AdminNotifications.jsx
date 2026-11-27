import { useState } from "react";
import { Bell, Package, Warning, XCircle } from "@phosphor-icons/react";
import axios from "../../axios";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import Skeleton from "../../ui/Skeleton";
import { toast } from "../../ui/toast";
import useApiData from "../../hooks/useApiData";
import { apiError, formatDateTime } from "../../lib/format";

const ICONS = {
  NEW_ORDER: { icon: Package, color: "text-info", label: "New order" },
  LOW_STOCK: { icon: Warning, color: "text-warning", label: "Low stock" },
  OUT_OF_STOCK: { icon: Warning, color: "text-danger", label: "Out of stock" },
  ORDER_CANCELLED: { icon: XCircle, color: "text-danger", label: "Cancelled" },
};

export default function AdminNotifications({ onChanged }) {
  const { data, setData, status, reload } = useApiData("/admin/notifications?limit=50");
  const [busy, setBusy] = useState(false);

  const unread = (data || []).filter((item) => !item.seen).length;

  const markOne = async (id) => {
    try {
      await axios.post(`/admin/notifications/${id}/read`);
      setData((current) => current.map((item) => (item.id === id ? { ...item, seen: true } : item)));
      onChanged();
    } catch (error) {
      toast.error(apiError(error, "The notification could not be updated."));
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await axios.post("/admin/notifications/read-all");
      setData((current) => current.map((item) => ({ ...item, seen: true })));
      onChanged();
    } catch (error) {
      toast.error(apiError(error, "The notifications could not be updated."));
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <Alert
        kind="error"
        title="Notifications could not be loaded"
        action={
          <Button variant="secondary" size="sm" onClick={reload}>
            Try again
          </Button>
        }
      >
        Check your connection and try again.
      </Alert>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState icon={Bell} title="No notifications yet">
        You will see an entry here for every product a customer orders, and when stock runs low.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="body-6 text-muted">{unread === 0 ? "You are all caught up." : `${unread} unread`}</p>
        <Button variant="secondary" size="sm" disabled={unread === 0 || busy} onClick={markAll}>
          Mark all as read
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {data.map((item) => {
          const meta = ICONS[item.type] || ICONS.NEW_ORDER;
          const Icon = meta.icon;
          return (
            <li
              key={item.id}
              className={`flex items-start gap-3 rounded-2xl border border-line p-4 ${item.seen ? "bg-page" : "bg-surface"}`}
            >
              <Icon size={20} weight="fill" className={`mt-0.5 shrink-0 ${meta.color}`} aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className={item.seen ? "body-6 text-muted" : "body-4"}>{item.message}</p>
                <p className="caption-2 text-subtle">
                  {meta.label} · {formatDateTime(item.createdAt)}
                  {item.seen ? "" : " · Unread"}
                </p>
              </div>
              {!item.seen && (
                <Button variant="ghost" size="sm" onClick={() => markOne(item.id)}>
                  Mark as read
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
