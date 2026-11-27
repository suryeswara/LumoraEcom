import { Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { BRAND } from "../config/brand";

function LegalPage({ title, updated, children }) {
  useDocumentTitle(title);
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 md:px-6">
      <Link to="/" className="button-sm inline-flex items-center gap-2 text-muted transition-colors duration-300 ease-brand hover:text-fg">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the shop
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="heading-3">{title}</h1>
        <p className="caption-2 text-subtle">Last updated {updated}</p>
      </header>
      <div className="flex flex-col gap-8">{children}</div>
    </article>
  );
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="heading-6">{title}</h2>
      <div className="body-3 flex flex-col gap-3 text-muted">{children}</div>
    </section>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="18 November 2026">
      <Section title="Who we are">
        <p>
          {BRAND.name} is operated by {"{{company legal name}}"}. For privacy questions write to {"{{support email}}"}.
        </p>
      </Section>
      <Section title="What we collect">
        <p>
          When you create an account we store your name, your email address and a hashed version of your password. We
          never store the password itself.
        </p>
        <p>
          When you place an order we store the name and email you enter, the products, quantities and totals, and the
          status of the order.
        </p>
      </Section>
      <Section title="What stays in your browser">
        <p>
          Your sign in token, your cart and your theme choice are saved in your browser storage so the site works
          between visits. We do not use advertising or analytics cookies.
        </p>
      </Section>
      <Section title="AI features">
        <p>
          Smart search, the assistant and the admin product tools send text to an AI provider, OpenAI, to produce their
          results. The assistant sends your question together with product details and summaries of your own orders.
          Those summaries contain the order number, date, status and items. They do not contain your name or email.
          Please do not type sensitive personal information into the assistant.
        </p>
      </Section>
      <Section title="Who can see your data">
        <p>
          You can see your own orders. Store staff with an admin account can see all orders so they can process them.
          Other customers cannot see your orders.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          To get a copy of your data or to delete your account, write to {"{{support email}}"}.
        </p>
      </Section>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of use" updated="18 November 2026">
      <Section title="Using the store">
        <p>
          You can browse products without an account. To place an order or use the assistant you need an account. Keep
          your login details private and give accurate information when you order.
        </p>
      </Section>
      <Section title="Orders">
        <p>
          Confirming checkout reserves the items in your order. You can cancel an order until it ships, and the items
          return to stock. Payment, refund and delivery terms: {"{{payment and refund terms}}"}.
        </p>
      </Section>
      <Section title="Prices and stock">
        <p>
          Prices are shown in Indian rupees. Prices and stock can change at any time. If an item is no longer available
          when you confirm, the order is not placed and you are told which item is affected.
        </p>
      </Section>
      <Section title="AI features">
        <p>
          Search results and assistant answers are generated automatically and can be wrong. Check important details on
          the product page before you order.
        </p>
      </Section>
      <Section title="Contact and governing law">
        <p>
          Questions about these terms: {"{{support email}}"}. Governing law: {"{{governing law}}"}.
        </p>
      </Section>
    </LegalPage>
  );
}
