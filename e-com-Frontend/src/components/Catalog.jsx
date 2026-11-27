import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Storefront } from "@phosphor-icons/react";
import AppContext from "../Context/Context";
import AuthContext from "../Context/AuthContext";
import ProductCard from "./ProductCard";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import EmptyState from "../ui/EmptyState";
import { ProductCardSkeleton } from "../ui/Skeleton";

export default function Catalog({ categories }) {
  const { data, isError, isLoading, refreshData } = useContext(AppContext);
  const { isAdmin } = useContext(AuthContext);
  const [category, setCategory] = useState("");

  const visible = useMemo(
    () => (category ? data.filter((product) => product.category === category) : data),
    [data, category]
  );

  return (
    <section id="shop" aria-labelledby="shop-title" className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 id="shop-title" className="heading-3">
            Shop the collection
          </h1>
          {!isLoading && !isError && (
            <p className="body-6 text-muted">
              {visible.length} {visible.length === 1 ? "product" : "products"}
              {category ? ` in ${category}` : ""}
            </p>
          )}
        </div>

        {categories.length > 1 && (
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
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
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <Alert
          kind="error"
          title="Products could not be loaded"
          action={
            <Button variant="secondary" size="sm" onClick={refreshData}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Alert>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Storefront}
          title={category ? `No products in ${category}` : "No products yet"}
          actions={
            category ? (
              <Button variant="secondary" onClick={() => setCategory("")}>
                Show all products
              </Button>
            ) : isAdmin ? (
              <Button as={Link} to="/add_product">
                <Plus size={20} aria-hidden="true" />
                Add the first product
              </Button>
            ) : null
          }
        >
          {category ? "Pick another category to keep browsing." : "New products will appear here as soon as they are added."}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
