import { useContext } from "react";
import { Link } from "react-router-dom";
import { PencilSimple, ShoppingCart } from "@phosphor-icons/react";
import AppContext from "../Context/Context";
import AuthContext from "../Context/AuthContext";
import ProductImage from "../ui/ProductImage";
import Button from "../ui/Button";
import { toast } from "../ui/toast";
import { formatINR } from "../lib/format";

export default function ProductCard({ product }) {
  const { addToCart } = useContext(AppContext);
  const { isAdmin } = useContext(AuthContext);
  const { id, name, brand, price, productAvailable, stockQuantity } = product;
  const soldOut = !productAvailable || stockQuantity <= 0;

  const handleAdd = () => {
    if (addToCart(product)) toast.success(`${name} added to your cart`);
    else toast.info("Your cart already holds all the stock available for this item");
  };

  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-2 transition-colors duration-300 ease-brand hover:bg-raised">
      <Link to={`/product/${id}`} className="flex flex-col gap-4 rounded-lg">
        {/* Outer radius 16px minus the 8px gap gives the image an 8px radius */}
        <ProductImage product={product} alt={name} className="aspect-square w-full rounded-lg" />
        <div className="flex flex-col gap-1 px-2">
          <h3 className="title-3 line-clamp-2">{name}</h3>
          {brand && <p className="caption-2 text-subtle">{brand}</p>}
        </div>
      </Link>
      <div className="mt-auto flex flex-col gap-3 p-2 pt-4">
        <p className="body-1">{formatINR(price)}</p>
        {isAdmin ? (
          <Button as={Link} to={`/product/update/${id}`} variant="secondary" size="sm">
            <PencilSimple size={16} aria-hidden="true" />
            Edit product
          </Button>
        ) : (
          <Button variant={soldOut ? "secondary" : "primary"} size="sm" onClick={handleAdd} disabled={soldOut}>
            <ShoppingCart size={16} aria-hidden="true" />
            {soldOut ? "Out of stock" : "Add to cart"}
          </Button>
        )}
      </div>
    </article>
  );
}
