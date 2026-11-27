import { useSearchParams } from "react-router-dom";
import { Bell, ChartBar, Package, Receipt, Sparkle, Users } from "@phosphor-icons/react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AdminAi from "./AdminAi";
import AdminCustomers from "./AdminCustomers";
import AdminNotifications from "./AdminNotifications";
import AdminOrders from "./AdminOrders";
import AdminOverview from "./AdminOverview";
import AdminProducts from "./AdminProducts";

const TABS = [
  { id: "overview", label: "Overview", icon: ChartBar },
  { id: "products", label: "Products and stock", icon: Package },
  { id: "orders", label: "Orders", icon: Receipt },
  { id: "customers", label: "Customers", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI assistant", icon: Sparkle },
];

export default function AdminDashboard() {
  useDocumentTitle("Admin dashboard");
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some((item) => item.id === requested) ? requested : "overview";

  const open = (id) => setParams({ tab: id }, { replace: false });
  const notifyBell = () => window.dispatchEvent(new Event("admin:notifications-changed"));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="heading-3">Admin dashboard</h1>
        <p className="body-6 text-muted">Manage products, stock, orders, customers and payments in one place.</p>
      </header>

      <div role="tablist" aria-label="Admin sections" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => open(id)}
            className={`button-sm inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-300 ease-brand ${
              tab === id ? "bg-fg text-page" : "border border-line bg-raised text-fg hover:bg-hover"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && <AdminOverview onOpenTab={open} />}
        {tab === "products" && <AdminProducts />}
        {tab === "orders" && <AdminOrders />}
        {tab === "customers" && <AdminCustomers />}
        {tab === "notifications" && <AdminNotifications onChanged={notifyBell} />}
        {tab === "ai" && <AdminAi />}
      </div>
    </div>
  );
}
