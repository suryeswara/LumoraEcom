import { Circle } from "@phosphor-icons/react";

const statuses = {
  PLACED: { label: "Placed", color: "text-info" },
  CONFIRMED: { label: "Confirmed", color: "text-warning" },
  SHIPPED: { label: "Shipped", color: "text-info" },
  DELIVERED: { label: "Delivered", color: "text-success" },
  CANCELLED: { label: "Cancelled", color: "text-danger" },
};

// A colored dot plus a text label, so status is never conveyed by color alone.
export default function StatusLabel({ status }) {
  const { label, color } = statuses[status] || { label: status || "Unknown", color: "text-subtle" };
  return (
    <span className="caption-1 inline-flex items-center gap-2 rounded-lg bg-raised px-2 py-1 text-fg">
      <Circle size={8} weight="fill" className={color} aria-hidden="true" />
      {label}
    </span>
  );
}
