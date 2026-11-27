import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PencilSimple, Plus, Package } from "@phosphor-icons/react";
import axios from "../../axios";
import AppContext from "../../Context/Context";
import Alert from "../../ui/Alert";
import Button from "../../ui/Button";
import EmptyState from "../../ui/EmptyState";
import ProductImage from "../../ui/ProductImage";
import Skeleton from "../../ui/Skeleton";
import { Input } from "../../ui/Field";
import { toast } from "../../ui/toast";
import useApiData from "../../hooks/useApiData";
import { apiError, formatINR } from "../../lib/format";

function StockRowItem({ row, product, onSaved }) {
  const [value, setValue] = useState(String(row.stockQuantity));
  const [busy, setBusy] = useState(false);
  const number = Number(value);
  const valid = value !== "" && Number.isInteger(number) && number >= 0;
  const changed = valid && number !== row.stockQuantity;

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await axios.patch(`/admin/products/${row.id}/stock`, { stockQuantity: number });
      onSaved(data);
      toast.success(`Stock for ${row.name} is now ${data.stockQuantity}`);
    } catch (error) {
      toast.error(apiError(error, "The stock could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-2">
      <ProductImage
        product={product}
        alt=""
        className="size-16 shrink-0 rounded-lg"
        iconSize={20}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="body-4 truncate">{row.name}</p>
        <p className="caption-2 text-subtle">
          {row.brand ? `${row.brand} · ` : ""}
          {formatINR(row.price)} · {row.unitsSold} sold
        </p>
        {row.stockQuantity === 0 ? (
          <p className="caption-1 text-danger">Out of stock</p>
        ) : row.lowStock ? (
          <p className="caption-1 text-warning">Low stock</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 pr-2">
        <label htmlFor={`stock-${row.id}`} className="sr-only">
          Stock for {row.name}
        </label>
        <Input
          id={`stock-${row.id}`}
          type="number"
          min="0"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          invalid={!valid}
          disabled={busy}
          className="w-24"
        />
        <Button size="sm" disabled={!changed || busy} onClick={save}>
          {busy ? "Saving" : "Save"}
        </Button>
        <Button as={Link} to={`/product/update/${row.id}`} variant="secondary" size="sm" aria-label={`Edit ${row.name}`}>
          <PencilSimple size={16} aria-hidden="true" />
          Edit
        </Button>
      </div>
    </li>
  );
}

export default function AdminProducts() {
  const { data, setData, status, reload } = useApiData("/admin/stock");
  const { data: catalog } = useContext(AppContext);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  const productById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  const rows = useMemo(() => data || [], [data]);
  const categories = useMemo(() => [...new Set(rows.map((row) => row.category))].sort(), [rows]);
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!category || row.category === category) && row.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [rows, category, query]
  );
  const grouped = useMemo(() => {
    const map = new Map();
    visible.forEach((row) => map.set(row.category, [...(map.get(row.category) || []), row]));
    return [...map.entries()];
  }, [visible]);

  const replaceRow = (updated) =>
    setData((current) => current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));

  const addLink = category ? `/add_product?category=${encodeURIComponent(category)}` : "/add_product";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {["", ...categories].map((name) => (
            <Button
              key={name || "all"}
              size="sm"
              variant={category === name ? "primary" : "secondary"}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name || "All"}
            </Button>
          ))}
        </div>
        <Button as={Link} to={addLink}>
          <Plus size={20} aria-hidden="true" />
          {category ? `Add to ${category}` : "Add product"}
        </Button>
      </div>

      <div className="max-w-md">
        <label htmlFor="product-filter" className="sr-only">
          Search products
        </label>
        <Input
          id="product-filter"
          type="search"
          placeholder="Search by product name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {status === "loading" && (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Alert
          kind="error"
          title="Products could not be loaded"
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Alert>
      )}

      {status === "ready" && visible.length === 0 && (
        <EmptyState
          icon={Package}
          title="No products found"
          actions={
            <Button as={Link} to={addLink}>
              Add a product
            </Button>
          }
        >
          Products you add appear here, grouped by category, and in the shop for customers.
        </EmptyState>
      )}

      {status === "ready" &&
        grouped.map(([name, items]) => (
          <section key={name} aria-labelledby={`cat-${name}`} className="flex flex-col gap-3">
            <h2 id={`cat-${name}`} className="title-2">
              {name} <span className="caption-1 text-subtle">({items.length})</span>
            </h2>
            <ul className="flex flex-col gap-3">
              {items.map((row) => (
                <StockRowItem
                  key={`${row.id}-${row.stockQuantity}`}
                  row={row}
                  product={productById.get(row.id)}
                  onSaved={replaceRow}
                />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
