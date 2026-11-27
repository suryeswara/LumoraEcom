import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Circle, PencilSimple, ShoppingCart, Trash } from "@phosphor-icons/react";
import AppContext from "../Context/Context";
import AuthContext from "../Context/AuthContext";
import axios from "../axios";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import ConfirmDialog from "../ui/ConfirmDialog";
import EmptyState from "../ui/EmptyState";
import ProductImage from "../ui/ProductImage";
import Skeleton from "../ui/Skeleton";
import { toast } from "../ui/toast";
import { apiError, formatDate, formatINR } from "../lib/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Product = () => {
  const { id } = useParams();
  const { addToCart, removeFromCart, refreshData } = useContext(AppContext);
  const { isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [product, setProduct] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("loading");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useDocumentTitle(product?.name || "Product");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    const load = async () => {
      setStatus("loading");
      try {
        const { data } = await axios.get(`${baseUrl}/api/product/${id}`);
        if (cancelled) return;
        setProduct(data);
        setStatus("ready");
        // Some responses omit the image bytes; fall back to the image endpoint.
        if (!data.productImage && data.imageName) {
          const image = await axios.get(`${baseUrl}/api/product/${id}/image`, { responseType: "blob" });
          if (cancelled) return;
          objectUrl = URL.createObjectURL(image.data);
          setImageUrl(objectUrl);
        }
      } catch (error) {
        if (!cancelled) setStatus(error.response?.status === 404 ? "missing" : "error");
      }
    };

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, baseUrl]);

  const handleAdd = () => {
    if (addToCart(product)) toast.success(`${product.name} added to your cart`);
    else toast.info("Your cart already holds all the stock available for this item");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${baseUrl}/api/product/${id}`);
      removeFromCart(id);
      await refreshData();
      toast.success("Product deleted");
      navigate("/shop");
    } catch (error) {
      toast.error(apiError(error, "The product could not be deleted. Please try again."));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const back = (
    <Link
      to="/shop"
      className="button-sm inline-flex items-center gap-2 text-muted transition-colors duration-300 ease-brand hover:text-fg"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Back to the shop
    </Link>
  );

  if (status === "loading") {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6" aria-busy="true">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-12 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 md:px-6">
        {back}
        {status === "missing" ? (
          <EmptyState title="This product is not available" actions={<Button as={Link} to="/shop">Browse products</Button>}>
            It may have been removed from the store.
          </EmptyState>
        ) : (
          <Alert kind="error" title="The product could not be loaded">
            Check your connection and refresh the page.
          </Alert>
        )}
      </div>
    );
  }

  const soldOut = !product.productAvailable || product.stockQuantity <= 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      {back}
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-2">
          <ProductImage
            product={product}
            src={imageUrl}
            alt={product.name}
            fit="contain"
            iconSize={48}
            className="aspect-square w-full rounded-lg bg-raised"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            {product.category && (
              <span className="caption-3 rounded-lg bg-raised px-2 py-1">{product.category}</span>
            )}
            {product.releaseDate && (
              <span className="caption-2 text-subtle">Listed {formatDate(product.releaseDate)}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="heading-3">{product.name}</h1>
            {product.brand && <p className="body-6 text-subtle">by {product.brand}</p>}
          </div>

          <p className="heading-4">{formatINR(product.price)}</p>

          <p className="body-5 flex items-center gap-2">
            <Circle size={8} weight="fill" className={soldOut ? "text-danger" : "text-success"} aria-hidden="true" />
            {soldOut ? "Out of stock" : `In stock, ${product.stockQuantity} available`}
          </p>

          {product.description && (
            <section aria-labelledby="description-title" className="flex flex-col gap-2">
              <h2 id="description-title" className="title-4 text-subtle">
                Description
              </h2>
              <p className="body-3 text-muted">{product.description}</p>
            </section>
          )}

          {!isAdmin && (
            <Button size="lg" onClick={handleAdd} disabled={soldOut} className="w-full sm:w-auto sm:self-start">
              <ShoppingCart size={20} aria-hidden="true" />
              {soldOut ? "Out of stock" : "Add to cart"}
            </Button>
          )}

          {isAdmin && (
            <div className="flex flex-col gap-3 border-t border-line pt-6">
              <p className="caption-3 text-subtle">Admin</p>
              <div className="flex flex-wrap gap-2">
                <Button as={Link} to={`/product/update/${id}`} variant="secondary">
                  <PencilSimple size={20} aria-hidden="true" />
                  Edit product
                </Button>
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash size={20} aria-hidden="true" />
                  Delete product
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this product?"
        message={`${product.name} will be removed from the store. This cannot be undone. Products that are part of an existing order cannot be deleted.`}
        confirmLabel="Delete product"
        cancelLabel="Keep product"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};

export default Product;
