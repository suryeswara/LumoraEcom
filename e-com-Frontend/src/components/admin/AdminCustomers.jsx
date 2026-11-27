import { useMemo, useState } from "react";
import { Users } from "@phosphor-icons/react";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import Skeleton from "../../ui/Skeleton";
import { Input } from "../../ui/Field";
import useApiData from "../../hooks/useApiData";
import { formatDate, formatINR } from "../../lib/format";

export default function AdminCustomers() {
  const { data, status, reload } = useApiData("/admin/customers");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data || []).filter((row) => !term || row.fullName.toLowerCase().includes(term) || row.email.includes(term));
  }, [data, query]);

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
        title="Customers could not be loaded"
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

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-md">
        <label htmlFor="customer-filter" className="sr-only">
          Search customers
        </label>
        <Input
          id="customer-filter"
          type="search"
          placeholder="Search by name or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No customers found">
          Customers appear here after they create an account.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="body-6 w-full min-w-168 text-left">
            <caption className="sr-only">Customers with their order totals. Cancelled orders are not counted.</caption>
            <thead>
              <tr className="border-b border-line text-subtle">
                <th scope="col" className="caption-1 p-4">Customer</th>
                <th scope="col" className="caption-1 p-4">Joined</th>
                <th scope="col" className="caption-1 p-4">Orders</th>
                <th scope="col" className="caption-1 p-4">Total spent</th>
                <th scope="col" className="caption-1 p-4">Last order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="p-4">
                    <p className="body-4">{row.fullName}</p>
                    <p className="caption-2 text-subtle">{row.email}</p>
                  </td>
                  <td className="p-4 text-muted">{formatDate(row.joinedAt)}</td>
                  <td className="p-4">{row.orderCount}</td>
                  <td className="p-4">{formatINR(row.totalSpent)}</td>
                  <td className="p-4 text-muted">{row.lastOrderDate ? formatDate(row.lastOrderDate) : "No orders"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
