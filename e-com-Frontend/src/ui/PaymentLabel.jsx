import { Circle } from "@phosphor-icons/react";
import { PAYMENT_STATUS_LABEL } from "../lib/format";

const colors = { PENDING: "text-warning", PAID: "text-success", FAILED: "text-danger", REFUNDED: "text-info" };

// Same pattern as StatusLabel: a dot plus words, so meaning never depends on color.
export default function PaymentLabel({ status }) {
  const label = status ? PAYMENT_STATUS_LABEL[status] || status : "Payment not recorded";
  return (
    <span className="caption-1 inline-flex items-center gap-2 rounded-lg bg-raised px-2 py-1 text-fg">
      <Circle size={8} weight="fill" className={colors[status] || "text-subtle"} aria-hidden="true" />
      {label}
    </span>
  );
}
