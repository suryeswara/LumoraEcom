import { Link } from "react-router-dom";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import Skeleton from "../../ui/Skeleton";
import useApiData from "../../hooks/useApiData";
import { formatINR } from "../../lib/format";
import StatCard from "./StatCard";

const STATUS_ORDER = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
const STATUS_TEXT = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
const PAYMENT_TEXT = {
  PENDING: "Payment pending",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  NOT_RECORDED: "Not recorded",
};

function Breakdown({ title, rows }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <h3 className="title-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="body-6 text-muted">Nothing to show yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(([name, count]) => (
            <li key={name} className="body-6 flex justify-between gap-4">
              <span className="text-muted">{name}</span>
              <span className="body-4">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminOverview({ onOpenTab }) {
  const dashboard = useApiData("/admin/dashboard");
  const alerts = useApiData("/admin/alerts");

  if (dashboard.status === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (dashboard.status === "error") {
    return (
      <Alert
        kind="error"
        title="The dashboard could not be loaded"
        action={
          <Button variant="secondary" size="sm" onClick={dashboard.reload}>
            Try again
          </Button>
        }
      >
        Check your connection and try again.
      </Alert>
    );
  }

  const d = dashboard.data;
  const statusRows = STATUS_ORDER.filter((key) => d.ordersByStatus[key]).map((key) => [STATUS_TEXT[key], d.ordersByStatus[key]]);
  const paymentRows = Object.entries(d.ordersByPaymentStatus).map(([key, count]) => [PAYMENT_TEXT[key] || key, count]);
  const categoryRows = Object.entries(d.productsByCategory);
  const alertList = alerts.data || [];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Orders" value={d.totalOrders} />
        <StatCard label="Customers" value={d.totalCustomers} />
        <StatCard label="Products" value={d.totalProducts} />
        <StatCard label="Units ordered" value={d.unitsOrdered} hint="Cancelled orders are not counted" />
        <StatCard label="Payments received" value={formatINR(d.revenue)} />
        <StatCard label="Payments pending" value={formatINR(d.pendingPayments)} />
      </div>

      <section aria-labelledby="attention-title" className="flex flex-col gap-3">
        <h2 id="attention-title" className="heading-6">
          Needs your attention
        </h2>
        {alertList.length === 0 ? (
          <Alert kind="success" title="Nothing needs attention right now">
            Stock levels, shipping times and payments all look fine.
          </Alert>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertList.map((text) => (
              <li key={text} className="body-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
                <Warning size={20} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenTab("products")}>
            Manage stock
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onOpenTab("orders")}>
            Review orders
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onOpenTab("ai")}>
            Ask the AI assistant
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Breakdown title="Orders by status" rows={statusRows} />
        <Breakdown title="Payments" rows={paymentRows} />
        <Breakdown title="Products by category" rows={categoryRows} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <h3 className="title-3">Best selling products</h3>
          {d.topProducts.length === 0 ? (
            <p className="body-6 text-muted">No sales yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {d.topProducts.map((item) => (
                <li key={item.productId} className="body-6 flex justify-between gap-4">
                  <Link to={`/product/${item.productId}`} className="min-w-0 truncate text-muted hover:text-fg">
                    {item.name}
                  </Link>
                  <span className="shrink-0">
                    {item.unitsSold} sold, {formatINR(item.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <h3 className="title-3">Low stock (at most {d.lowStockThreshold})</h3>
          {d.lowStock.length === 0 ? (
            <p className="body-6 flex items-center gap-2 text-muted">
              <CheckCircle size={20} weight="fill" className="text-success" aria-hidden="true" />
              Every product is above the limit.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.lowStock.map((item) => (
                <li key={item.id} className="body-6 flex justify-between gap-4">
                  <span className="min-w-0 truncate text-muted">{item.name}</span>
                  <span className="body-4 shrink-0">{item.stockQuantity === 0 ? "Out of stock" : `${item.stockQuantity} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
