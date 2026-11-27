import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, MagnifyingGlass } from "@phosphor-icons/react";
import axios from "../axios";
import ProductCard from "./ProductCard";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { ProductCardSkeleton } from "../ui/Skeleton";
import useDocumentTitle from "../hooks/useDocumentTitle";

const SearchResults = () => {
  const [params] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("loading");

  useDocumentTitle(query ? `Results for ${query}` : "Search");

  useEffect(() => {
    if (!query) {
      setStatus("empty");
      return undefined;
    }
    let cancelled = false;
    setStatus("loading");
    axios
      .get(`${baseUrl}/api/products/smart-search`, { params: { query } })
      .then(({ data }) => {
        if (cancelled) return;
        setResults(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [query, baseUrl]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <Link
        to="/shop"
        className="button-sm inline-flex items-center gap-2 self-start text-muted transition-colors duration-300 ease-brand hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the shop
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="heading-3">{query ? `Results for “${query}”` : "Search"}</h1>
        {status === "ready" && (
          <p className="body-6 text-muted">
            {results.length} {results.length === 1 ? "product" : "products"} matched your description
          </p>
        )}
      </header>

      {status === "loading" && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      )}

      {status === "error" && (
        <Alert kind="error" title="Search is unavailable right now">
          Please try again in a moment.
        </Alert>
      )}

      {(status === "empty" || (status === "ready" && results.length === 0)) && (
        <EmptyState
          icon={MagnifyingGlass}
          title={query ? "No products matched" : "Describe what you are looking for"}
          actions={
            <Button as={Link} to="/shop">
              Browse all products
            </Button>
          }
        >
          {query
            ? "Try different words, or describe the product in a full sentence."
            : "Use the search button in the menu and type a sentence."}
        </EmptyState>
      )}

      {status === "ready" && results.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {results.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchResults;
