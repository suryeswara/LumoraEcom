import { useContext, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { MagnifyingGlass, Moon, ShoppingCart, SignOut, Sun } from "@phosphor-icons/react";
import AuthContext from "../Context/AuthContext";
import AppContext from "../Context/Context";
import useTheme from "../hooks/useTheme";
import { BRAND } from "../config/brand";
import BrandMark from "../ui/BrandMark";
import Button from "../ui/Button";
import SearchDialog from "./SearchDialog";
import NotificationBell from "./admin/NotificationBell";

function MenuToggle({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="mobile-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      className="flex size-10 items-center justify-center rounded-lg text-fg transition-colors duration-300 ease-brand hover:bg-hover lg:hidden"
    >
      {/* Three lines that transform into a cross, on the base motion curve */}
      <span className="relative block h-2.5 w-5" aria-hidden="true">
        <span
          className={`absolute left-0 top-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-500 ease-brand ${
            open ? "translate-y-1 rotate-45" : ""
          }`}
        />
        <span
          className={`absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition-opacity duration-300 ease-brand ${
            open ? "opacity-0" : ""
          }`}
        />
        <span
          className={`absolute bottom-0 left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-500 ease-brand ${
            open ? "-translate-y-1 -rotate-45" : ""
          }`}
        />
      </span>
    </button>
  );
}

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useContext(AuthContext);
  const { cart } = useContext(AppContext);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Customers shop, follow their orders and ask the assistant. Admins manage the store from the dashboard.
  const links = [
    { to: "/", label: "Home", end: true },
    { to: "/shop", label: "Shop" },
    ...(isAuthenticated && !isAdmin
      ? [
          { to: "/orders", label: "My orders" },
          { to: "/askai", label: "Ask AI" },
        ]
      : []),
    ...(isAdmin
      ? [
          { to: "/admin", label: "Dashboard" },
          { to: "/add_product", label: "Add product" },
        ]
      : []),
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `button-sm rounded-lg px-3 py-2 transition-colors duration-300 ease-brand ${
      isActive ? "bg-hover text-fg" : "text-muted hover:bg-hover hover:text-fg"
    }`;

  // Staggered entrance for items in the open mobile menu: 60ms apart, capped at 400ms in total.
  const stagger = (index) => ({ transitionDelay: menuOpen ? `${Math.min(index * 60, 400)}ms` : "0ms" });
  const item = `transition-[transform,opacity] duration-500 ease-brand motion-reduce:translate-y-0 ${
    menuOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
  }`;

  const firstName = user?.fullName?.split(" ")[0];

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav
          aria-label="Main"
          className="pointer-events-auto flex w-max max-w-full items-center gap-2 rounded-2xl border border-line bg-page/70 px-3 py-2 backdrop-blur-xl"
        >
          <Link to="/" aria-label={`${BRAND.name} home`} className="flex items-center gap-2 rounded-lg pr-2">
            <BrandMark />
            <span className="title-2">{BRAND.name}</span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <span className="hidden h-6 border-l border-line lg:block" aria-hidden="true" />

          <div className="flex items-center gap-1">
            {isAuthenticated && (
              <Button variant="ghost" icon aria-label="Search products" onClick={() => setSearchOpen(true)}>
                <MagnifyingGlass size={20} />
              </Button>
            )}
            {/* Wrapper hides it on small screens; the mobile menu has its own theme button */}
            <div className="hidden lg:block">
              <Button
                variant="ghost"
                icon
                onClick={toggle}
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
            </div>
            <NotificationBell />
            {isAuthenticated && !isAdmin && (
              <Button
                as={Link}
                to="/cart"
                variant="ghost"
                icon
                className="relative"
                aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="caption-3 absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-fg px-1 text-page">
                    {cartCount}
                  </span>
                )}
              </Button>
            )}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <>
                <span className="caption-1 text-muted">
                  {firstName}
                  <span className="caption-3 ml-2 rounded-lg bg-raised px-2 py-1 text-fg">{isAdmin ? "Admin" : "Customer"}</span>
                </span>
                <Button variant="ghost" icon onClick={handleLogout} aria-label="Log out">
                  <SignOut size={20} />
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm">
                  Log in
                </Button>
                <Button as={Link} to="/register" size="sm">
                  Sign up
                </Button>
              </>
            )}
          </div>

          <MenuToggle open={menuOpen} onClick={() => setMenuOpen((value) => !value)} />
        </nav>
      </header>

      {/* Mobile menu: a full height panel at high opacity with a strong blur */}
      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        {...(menuOpen ? {} : { inert: "" })}
        className={`fixed inset-0 z-40 bg-page/95 backdrop-blur-2xl transition-opacity duration-500 ease-brand lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-full flex-col gap-8 overflow-y-auto px-6 pb-8 pt-24">
          <ul className="flex flex-col gap-2">
            {links.map((link, index) => (
              <li key={link.to} style={stagger(index)} className={item}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `heading-5 block rounded-lg py-2 transition-colors duration-300 ease-brand ${
                      isActive ? "text-fg" : "text-muted hover:text-fg"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-3">
            <div style={stagger(links.length)} className={item}>
              <Button variant="secondary" onClick={toggle} className="w-full">
                {theme === "dark" ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </Button>
            </div>
            {isAuthenticated ? (
              <div style={stagger(links.length + 1)} className={item}>
                <p className="body-5 mb-3 text-muted">
                  Signed in as {user.fullName} ({isAdmin ? "Admin" : "Customer"})
                </p>
                <Button variant="secondary" onClick={handleLogout} className="w-full">
                  <SignOut size={20} aria-hidden="true" />
                  Log out
                </Button>
              </div>
            ) : (
              <div style={stagger(links.length + 1)} className={`${item} flex flex-col gap-3`}>
                <Button as={Link} to="/register" className="w-full">
                  Sign up
                </Button>
                <Button as={Link} to="/login" variant="secondary" className="w-full">
                  Log in
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Navbar;
