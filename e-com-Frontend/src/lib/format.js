export function formatINR(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// The API returns product images as a base64 string plus a MIME type.
export function toImageSrc(product) {
  const raw = product?.productImage;
  if (!raw || typeof raw !== "string") return null;
  if (raw.startsWith("data:") || raw.startsWith("http")) return raw;
  return `data:${product.imageType || "image/jpeg"};base64,${raw}`;
}

export function apiError(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string" && data) return data;
  if (data?.message) return data.message;
  return fallback;
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// Keep in sync with PaymentMethod and PaymentStatus in the backend. Payment is collected at the door for now.
export const PAYMENT_METHODS = [
  { value: "COD", label: "Cash on delivery" },
  { value: "UPI", label: "UPI on delivery" },
  { value: "CARD", label: "Card on delivery" },
];
export const PAYMENT_METHOD_LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));
export const PAYMENT_STATUS_LABEL = {
  PENDING: "Payment pending",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
};
