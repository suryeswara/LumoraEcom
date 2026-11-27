import { Link } from "react-router-dom";
import { BRAND } from "../config/brand";
import BrandMark from "../ui/BrandMark";

function Column({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="title-4 text-fg">{title}</h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="body-6 text-muted transition-colors duration-300 ease-brand hover:text-fg">
        {children}
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-sunken">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-4 md:px-6">
        <div className="flex flex-col gap-3 md:col-span-2">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="title-2">{BRAND.name}</span>
          </div>
          <p className="body-6 max-w-sm text-muted">{BRAND.description}</p>
        </div>
        <Column title="Store">
          <FooterLink to="/shop">Shop</FooterLink>
          <FooterLink to="/cart">Cart</FooterLink>
          <FooterLink to="/orders">Orders</FooterLink>
        </Column>
        <Column title="Legal">
          <FooterLink to="/privacy">Privacy policy</FooterLink>
          <FooterLink to="/terms">Terms of use</FooterLink>
        </Column>
      </div>
      <div className="border-t border-line">
        <p className="caption-2 mx-auto max-w-6xl px-4 py-6 text-subtle md:px-6">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
