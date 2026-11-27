import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "@phosphor-icons/react";
import axios from "../axios";
import AppContext from "../Context/Context";
import AuthContext from "../Context/AuthContext";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { PAYMENT_METHODS, apiError, formatINR } from "../lib/format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s]{10,15}$/;

function CheckoutForm({ open, onClose, items, total }) {
  const { clearCart, refreshData } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [form, setForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: "",
    address: "",
    paymentMethod: "COD",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: undefined });
    setSubmitError("");
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Enter your name";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email";
    if (!PHONE_RE.test(form.phone.trim())) next.phone = "Enter a phone number with 10 to 15 digits";
    if (form.address.trim().length < 10) next.address = "Enter the full delivery address";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setSubmitError("");
    try {
      const { data } = await axios.post(`${baseUrl}/api/orders/place`, {
        customerName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        shippingAddress: form.address.trim(),
        paymentMethod: form.paymentMethod,
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
      });
      setPlaced(data);
      clearCart();
      refreshData();
    } catch (error) {
      const fields = error.response?.data?.fields;
      if (fields) {
        setErrors({
          name: fields.customerName,
          email: fields.email,
          phone: fields.phone,
          address: fields.shippingAddress,
        });
      }
      // Specific, for example: "Insufficient stock for Laptop (available: 1, requested: 3)"
      setSubmitError(apiError(error, "The order could not be placed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (placed) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        size="sm"
        title="Order placed"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Keep shopping
            </Button>
            <Button as={Link} to="/orders" onClick={onClose} data-autofocus>
              View my orders
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle size={48} weight="fill" className="text-success" aria-hidden="true" />
          <p className="body-3 text-muted">
            Your order <span className="body-1 text-fg">{placed.orderId}</span> is in. You can follow it, or cancel it
            before it ships, from My orders.
          </p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      dismissible={!busy}
      title="Confirm your order"
      description="Check the details below, then place the order."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Back to cart
          </Button>
          <Button type="submit" form="checkout-form" disabled={busy}>
            {busy ? "Placing order" : `Place order, ${formatINR(total)}`}
          </Button>
        </>
      }
    >
      <form id="checkout-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Full name" htmlFor="checkout-name" error={errors.name}>
          <Input
            id="checkout-name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            invalid={Boolean(errors.name)}
            disabled={busy}
            data-autofocus
          />
        </Field>
        <Field label="Email" htmlFor="checkout-email" error={errors.email}>
          <Input
            id="checkout-email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            invalid={Boolean(errors.email)}
            disabled={busy}
          />
        </Field>

        <Field label="Phone number" htmlFor="checkout-phone" error={errors.phone} hint="The courier may call this number">
          <Input
            id="checkout-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            invalid={Boolean(errors.phone)}
            disabled={busy}
          />
        </Field>
        <Field label="Delivery address" htmlFor="checkout-address" error={errors.address}>
          <Textarea
            id="checkout-address"
            name="address"
            rows={3}
            maxLength={500}
            autoComplete="street-address"
            value={form.address}
            onChange={handleChange}
            invalid={Boolean(errors.address)}
            disabled={busy}
          />
        </Field>
        <Field label="Payment" htmlFor="checkout-payment" hint="You pay when the order arrives.">
          <Select
            id="checkout-payment"
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            disabled={busy}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </Select>
        </Field>

        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-raised p-4">
          {items.map((item) => (
            <li key={item.id} className="body-6 flex justify-between gap-4">
              <span className="min-w-0 truncate text-muted">
                {item.name} × {item.quantity}
              </span>
              <span className="shrink-0">{formatINR(Number(item.price) * item.quantity)}</span>
            </li>
          ))}
        </ul>

        {submitError && (
          <Alert kind="error" title="The order was not placed">
            {submitError}
          </Alert>
        )}
      </form>
    </Dialog>
  );
}

// Remount the form each time the dialog opens so it always starts clean.
export default function CheckoutPopup(props) {
  if (!props.open) return null;
  return <CheckoutForm {...props} />;
}
