import { useContext, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CaretDown, Receipt } from "@phosphor-icons/react";
import axios from "../axios";
import AuthContext from "../Context/AuthContext";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import ConfirmDialog from "../ui/ConfirmDialog";
import EmptyState from "../ui/EmptyState";
import Skeleton from "../ui/Skeleton";
import StatusLabel from "../ui/StatusLabel";
import PaymentLabel from "../ui/PaymentLabel";
import { toast } from "../ui/toast";
import { PAYMENT_METHOD_LABEL, apiError, formatDate, formatDateTime, formatINR } from "../lib/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

// Mirrors the backend state machine (OrderStatus.canTransitionTo). The server enforces it.
const NEXT_STATUS = { PLACED: "CONFIRMED", CONFIRMED: "SHIPPED", SHIPPED: "DELIVERED" };
const CANCELLABLE = ["PLACED", "CONFIRMED"];
const LABELS = { CONFIRMED: "confirmed", SHIPPED: "shipped", DELIVERED: "delivered" };

const OrderList = () => {
  const { isAdmin } = useContext(AuthContext);
  useDocumentTitle(isAdmin ? "All orders" : "My orders");
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading");
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = () => {
    setStatus("loading");
    axios
      .get(`${baseUrl}/api/orders`)
      .then(({ data }) => {
        setOrders(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(load, [baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const replaceOrder = (updated) =>
    setOrders((current) => current.map((order) => (order.orderId === updated.orderId ? updated : order)));

  const runAction = async (orderId, request, success) => {
    setBusy(orderId);
    try {
      const { data } = await request();
      replaceOrder(data);
      toast.success(success);
    } catch (error) {
      toast.error(apiError(error, "That did not work. Please try again."));
    } finally {
      setBusy(null);
      setCancelTarget(null);
    }
  };

  const orderTotal = (order) =>
    order.totalAmount ?? order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="heading-3">{isAdmin ? "All orders" : "My orders"}</h1>
        <p className="body-6 text-muted">
          {isAdmin
            ? "Move orders forward as they are confirmed, shipped and delivered."
            : "Follow your orders, or cancel one before it ships."}
        </p>
      </header>

      {status === "loading" && (
        <div className="flex flex-col gap-4" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Alert
          kind="error"
          title="Orders could not be loaded"
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Alert>
      )}

      {status === "ready" && orders.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={isAdmin ? "No orders yet" : "You have not placed an order yet"}
          actions={
            <Button as={Link} to="/shop">
              Browse products
            </Button>
          }
        >
          {isAdmin ? "Orders will appear here as customers place them." : "When you do, it will show up here."}
        </EmptyState>
      )}

      {status === "ready" && orders.length > 0 && (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => {
            const open = expanded === order.orderId;
            const next = NEXT_STATUS[order.status];
            const working = busy === order.orderId;
            return (
              <li key={order.orderId} className="rounded-2xl border border-line bg-surface p-2">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="body-1">{order.orderId}</p>
                    <p className="caption-2 text-subtle">
                      {formatDate(order.orderDate)}
                      {isAdmin && ` · ${order.customerName}, ${order.email}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <StatusLabel status={order.status} />
                      <PaymentLabel status={order.paymentStatus} />
                    </div>
                    <p className="body-1">{formatINR(orderTotal(order))}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : order.orderId)}
                  >
                    {open ? "Hide items" : "View items"}
                    <CaretDown
                      size={16}
                      aria-hidden="true"
                      className={`transition-transform duration-500 ease-brand ${open ? "rotate-180" : ""}`}
                    />
                  </Button>
                  {isAdmin && next && (
                    <Button
                      size="sm"
                      disabled={working}
                      onClick={() =>
                        runAction(
                          order.orderId,
                          () => axios.patch(`${baseUrl}/api/orders/${order.orderId}/status`, { status: next }),
                          `Order marked as ${LABELS[next]}`
                        )
                      }
                    >
                      {working ? "Updating" : `Mark as ${LABELS[next]}`}
                    </Button>
                  )}
                  {CANCELLABLE.includes(order.status) && (
                    <Button variant="danger" size="sm" disabled={working} onClick={() => setCancelTarget(order)}>
                      Cancel order
                    </Button>
                  )}
                </div>

                {open && (
                  <div className="animate-fade-in mx-2 mb-2 rounded-xl bg-raised p-4">
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
                    <dl className="body-6 mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
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
                      {(order.shippedAt || order.deliveredAt) && (
                        <div className="flex flex-col gap-1">
                          <dt className="caption-1 text-subtle">Dates</dt>
                          <dd>
                            {order.shippedAt ? `Shipped ${formatDateTime(order.shippedAt)}` : ""}
                            {order.deliveredAt ? `, delivered ${formatDateTime(order.deliveredAt)}` : ""}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
          runAction(
            cancelTarget.orderId,
            () => axios.post(`${baseUrl}/api/orders/${cancelTarget.orderId}/cancel`),
            "Order cancelled"
          )
        }
      />
    </div>
  );
};

// Admins manage orders from the dashboard (shipping details, payments, filters). Customers see their own list.
const Order = () => {
  const { isAdmin } = useContext(AuthContext);
  return isAdmin ? <Navigate to="/admin?tab=orders" replace /> : <OrderList />;
};

export default Order;
