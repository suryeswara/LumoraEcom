import { useMemo, useState } from "react";
import { CaretDown, Receipt } from "@phosphor-icons/react";
import axios from "../../axios";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import ConfirmDialog from "../../ui/ConfirmDialog";
import Dialog from "../../ui/Dialog";
import EmptyState from "../../ui/EmptyState";
import PaymentLabel from "../../ui/PaymentLabel";
import Skeleton from "../../ui/Skeleton";
import StatusLabel from "../../ui/StatusLabel";
import { Field, Input, Select } from "../../ui/Field";
import { toast } from "../../ui/toast";
import useApiData from "../../hooks/useApiData";
import { PAYMENT_METHOD_LABEL, apiError, formatDate, formatDateTime, formatINR } from "../../lib/format";

// Mirrors the backend state machine (OrderStatus.canTransitionTo). The server enforces it.
const NEXT_STATUS = { PLACED: "CONFIRMED", CONFIRMED: "SHIPPED", SHIPPED: "DELIVERED" };
const NEXT_LABEL = { CONFIRMED: "Confirm order", SHIPPED: "Mark as shipped", DELIVERED: "Mark as delivered" };
const CANCELLABLE = ["PLACED", "CONFIRMED"];
const FILTERS = [
  ["", "All orders"],
  ["PLACED", "Placed"],
  ["CONFIRMED", "Confirmed"],
  ["SHIPPED", "Shipped"],
  ["DELIVERED", "Delivered"],
  ["CANCELLED", "Cancelled"],
];

function ShipDialog({ order, busy, onClose, onSubmit }) {
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      dismissible={!busy}
      size="sm"
      title={`Ship order ${order.orderId}`}
      description="Add the courier details so the customer can follow the parcel. Both are optional."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(carrier, tracking)} disabled={busy}>
            {busy ? "Saving" : "Mark as shipped"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Courier" htmlFor="ship-carrier" optional>
          <Input id="ship-carrier" value={carrier} maxLength={100} onChange={(e) => setCarrier(e.target.value)} data-autofocus />
        </Field>
        <Field label="Tracking number" htmlFor="ship-tracking" optional>
          <Input id="ship-tracking" value={tracking} maxLength={100} onChange={(e) => setTracking(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

export default function AdminOrders() {
  const { data, setData, status, reload } = useApiData("/orders");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);
  const [shipTarget, setShipTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const orders = useMemo(() => (data || []).filter((order) => !filter || order.status === filter), [data, filter]);

  const run = async (orderId, request, success) => {
    setBusy(orderId);
    try {
      const { data: updated } = await request();
      setData((current) => current.map((order) => (order.orderId === updated.orderId ? updated : order)));
      toast.success(success);
    } catch (error) {
      toast.error(apiError(error, "That did not work. Please try again."));
    } finally {
      setBusy(null);
      setShipTarget(null);
      setCancelTarget(null);
    }
  };

  const advance = (order, extra = {}) =>
    run(
      order.orderId,
      () => axios.patch(`/orders/${order.orderId}/status`, { status: NEXT_STATUS[order.status], ...extra }),
      `Order ${order.orderId} updated`
    );

  const setPayment = (order, paymentStatus) =>
    run(order.orderId, () => axios.patch(`/admin/orders/${order.orderId}/payment`, { paymentStatus }), "Payment updated");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map(([value, label]) => (
          <Button
            key={value || "all"}
            size="sm"
            variant={filter === value ? "primary" : "secondary"}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {status === "loading" && (
        <div className="flex flex-col gap-4" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Alert
          kind="error"
          title="Orders could not be loaded"
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Alert>
      )}

      {status === "ready" && orders.length === 0 && (
        <EmptyState icon={Receipt} title="No orders here">
          Orders will appear as customers place them.
        </EmptyState>
      )}

      {status === "ready" && orders.length > 0 && (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => {
            const open = expanded === order.orderId;
            const next = NEXT_STATUS[order.status];
            const working = busy === order.orderId;
            const canMarkPaid = order.status !== "CANCELLED" && order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED";
            return (
              <li key={order.orderId} className="rounded-2xl border border-line bg-surface p-2">
                <div className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="body-1">{order.orderId}</p>
                    <p className="caption-2 text-subtle">
                      {formatDate(order.orderDate)} · {order.customerName}
                    </p>
                    <p className="caption-2 text-subtle">
                      {order.email}
                      {order.phone ? ` · ${order.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="body-1">{formatINR(order.totalAmount)}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <StatusLabel status={order.status} />
                      <PaymentLabel status={order.paymentStatus} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  <Button variant="secondary" size="sm" aria-expanded={open} onClick={() => setExpanded(open ? null : order.orderId)}>
                    {open ? "Hide details" : "View details"}
                    <CaretDown
                      size={16}
                      aria-hidden="true"
                      className={`transition-transform duration-500 ease-brand ${open ? "rotate-180" : ""}`}
                    />
                  </Button>
                  {next && (
                    <Button
                      size="sm"
                      disabled={working}
                      onClick={() => (next === "SHIPPED" ? setShipTarget(order) : advance(order))}
                    >
                      {working ? "Updating" : NEXT_LABEL[next]}
                    </Button>
                  )}
                  {canMarkPaid && (
                    <Button variant="secondary" size="sm" disabled={working} onClick={() => setPayment(order, "PAID")}>
                      Mark as paid
                    </Button>
                  )}
                  {CANCELLABLE.includes(order.status) && (
                    <Button variant="danger" size="sm" disabled={working} onClick={() => setCancelTarget(order)}>
                      Cancel order
                    </Button>
                  )}
                </div>

                {open && (
                  <div className="animate-fade-in mx-2 mb-2 flex flex-col gap-4 rounded-xl bg-raised p-4">
                    <ul className="flex flex-col gap-2">
                      {order.items.map((item, index) => (
                        <li key={index} className="body-6 flex justify-between gap-4">
                          <span className="min-w-0 truncate text-muted">
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="shrink-0">{formatINR(item.totalPrice)}</span>
                        </li>
                      ))}
                    </ul>
                    <dl className="body-6 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <dt className="caption-1 text-subtle">Delivery address</dt>
                        <dd>{order.shippingAddress || "Not recorded"}</dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="caption-1 text-subtle">Payment</dt>
                        <dd>{order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] : "Not recorded"}</dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="caption-1 text-subtle">Shipment</dt>
                        <dd>
                          {order.shippedAt
                            ? `${order.carrier || "Courier not given"}, ${order.trackingNumber || "no tracking number"}`
                            : "Not shipped yet"}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="caption-1 text-subtle">Dates</dt>
                        <dd>
                          {order.shippedAt ? `Shipped ${formatDateTime(order.shippedAt)}` : "Not shipped"}
                          {order.deliveredAt ? `, delivered ${formatDateTime(order.deliveredAt)}` : ""}
                        </dd>
                      </div>
                    </dl>
                    {order.paymentStatus && order.status !== "CANCELLED" && (
                      <div className="flex max-w-xs flex-col gap-2">
                        <label htmlFor={`pay-${order.orderId}`} className="caption-1 text-subtle">
                          Payment status
                        </label>
                        <Select
                          id={`pay-${order.orderId}`}
                          value={order.paymentStatus}
                          disabled={working}
                          onChange={(event) => setPayment(order, event.target.value)}
                        >
                          <option value="PENDING">Payment pending</option>
                          <option value="PAID">Paid</option>
                          <option value="FAILED">Payment failed</option>
                          <option value="REFUNDED">Refunded</option>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {shipTarget && (
        <ShipDialog
          order={shipTarget}
          busy={busy === shipTarget.orderId}
          onClose={() => setShipTarget(null)}
          onSubmit={(carrier, trackingNumber) => advance(shipTarget, { carrier, trackingNumber })}
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this order?"
        message={`Order ${cancelTarget?.orderId ?? ""} will be cancelled and its items will go back into stock.`}
        confirmLabel="Cancel order"
        danger
        busy={Boolean(cancelTarget) && busy === cancelTarget.orderId}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() =>
          run(cancelTarget.orderId, () => axios.post(`/orders/${cancelTarget.orderId}/cancel`), "Order cancelled")
        }
      />
    </div>
  );
}
