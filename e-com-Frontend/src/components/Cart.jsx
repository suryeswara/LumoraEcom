import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash } from "@phosphor-icons/react";
import AppContext from "../Context/Context";
import AuthContext from "../Context/AuthContext";
import CheckoutPopup from "./CheckoutPopup";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import ProductImage from "../ui/ProductImage";
import { toast } from "../ui/toast";
import { formatINR } from "../lib/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Cart = () => {
  useDocumentTitle("Cart");
  const { cart, data, removeFromCart, updateQuantity } = useContext(AppContext);
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Prefer live product data (price, stock, photo) over what was saved when the item was added.
  const items = cart.map((item) => {
    const live = data.find((product) => product.id === item.id);
    return {
      ...item,
      name: live?.name ?? item.name,
      price: live?.price ?? item.price,
      stockQuantity: live?.stockQuantity ?? item.stockQuantity,
      product: live || item,
    };
  });

  const unitCount = items.reduce((total, item) => total + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.info("Please log in to place your order");
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    setCheckoutOpen(true);
  };

  if (items.length === 0 && !checkoutOpen) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="heading-3 mb-8">Your cart</h1>
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          actions={
            <Button as={Link} to="/shop">
              Browse products
            </Button>
          }
        >
          Add something from the collection and it will wait for you here.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h1 className="heading-3 mb-8">Your cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="flex flex-col gap-4 lg:col-span-2">
          {items.map((item) => {
            const atLimit = item.quantity >= item.stockQuantity;
            return (
              <li key={item.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-2">
                <Link to={`/product/${item.id}`} className="shrink-0 rounded-lg" aria-label={`View ${item.name}`}>
                  <ProductImage product={item.product} alt="" className="size-24 rounded-lg sm:size-32" iconSize={24} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-3 py-2 pr-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link to={`/product/${item.id}`} className="title-3 line-clamp-2">
                        {item.name}
                      </Link>
                      {item.brand && <p className="caption-2 text-subtle">{item.brand}</p>}
                    </div>
                    <p className="body-1 shrink-0">{formatINR(Number(item.price) * item.quantity)}</p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-line bg-raised p-1">
                      <Button
                        variant="ghost"
                        icon
                        className="size-8"
                        aria-label={`Decrease quantity of ${item.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="body-4 min-w-8 text-center" aria-live="polite">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        icon
                        className="size-8"
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={atLimit}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)}>
                      <Trash size={16} aria-hidden="true" />
                      Remove
                    </Button>
                  </div>

                  {item.quantity > item.stockQuantity ? (
                    <p className="caption-1 text-warning">
                      Only {item.stockQuantity} left. Reduce the quantity to continue.
                    </p>
                  ) : atLimit ? (
                    <p className="caption-2 text-subtle">You have all {item.stockQuantity} that are in stock.</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <aside aria-labelledby="summary-title" className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <h2 id="summary-title" className="heading-6">
              Order summary
            </h2>
            <dl className="flex flex-col gap-2">
              <div className="flex justify-between">
                <dt className="body-6 text-muted">Items</dt>
                <dd className="body-5">{unitCount}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3">
                <dt className="body-1">Total</dt>
                <dd className="body-1">{formatINR(total)}</dd>
              </div>
            </dl>
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={isAdmin || items.some((item) => item.quantity > item.stockQuantity)}
              className="w-full"
            >
              Checkout
            </Button>
            <p className="caption-2 text-subtle">
              {isAdmin
                ? "Admin accounts manage the store and cannot place orders. Use a customer account to shop."
                : isAuthenticated
                ? "You will confirm your details before the order is placed."
                : "You will be asked to log in before the order is placed."}
            </p>
          </div>
        </aside>
      </div>

      <CheckoutPopup open={checkoutOpen} onClose={() => setCheckoutOpen(false)} items={items} total={total} />
    </div>
  );
};

export default Cart;
