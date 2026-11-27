import { ArrowRight, ArrowUUpLeft, CaretDown, ChatCircleDots, MagnifyingGlass, Package, ShieldCheck } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import Reveal from "../../ui/Reveal";
import WordReveal from "../../ui/WordReveal";
import Button from "../../ui/Button";

const benefits = [
  {
    icon: MagnifyingGlass,
    title: "Search by meaning",
    text: "Describe the product in your own words. Matches are ranked by what you mean, so you do not need the exact name.",
  },
  {
    icon: ChatCircleDots,
    title: "An assistant that knows your orders",
    text: "Ask about products or about your own orders. It only sees the catalog and your orders, never anyone else's.",
  },
  {
    icon: Package,
    title: "Stock held at checkout",
    text: "Each item is reserved the moment you confirm, so one item is never sold to two people.",
  },
  {
    icon: ArrowUUpLeft,
    title: "Cancel before it ships",
    text: "Change your mind while an order is placed or confirmed and the items go straight back into stock.",
  },
];

const steps = [
  {
    title: "Describe or browse",
    text: "Search with a sentence, or filter the collection by category.",
  },
  {
    title: "Add to cart and confirm",
    text: "Pick quantities, log in, and confirm your name and email. Stock is reserved right away.",
  },
  {
    title: "Follow every step",
    text: "My orders shows each order as placed, confirmed, shipped or delivered, and lets you cancel early.",
  },
];

const faqs = [
  {
    q: "How does smart search work?",
    a: "Your sentence is compared with the meaning of each product listing and the closest matches are shown. Plain descriptions work best, for example a light laptop for travel.",
  },
  {
    q: "Do I need an account to browse?",
    a: "No. Browsing, search and the cart are open to everyone. You need an account to place an order or to use the assistant.",
  },
  {
    q: "Can I cancel an order?",
    a: "Yes, until it ships. Open My orders, choose Cancel, and the items return to stock.",
  },
  {
    q: "What if an item sells out while I check out?",
    a: "Stock is checked when you confirm. If an item is no longer available you are told which one, and nothing is ordered.",
  },
  {
    q: "Who can see my orders?",
    a: "You can. Store staff with an admin account can also see orders so they can process them. Other customers cannot.",
  },
  {
    q: "What can the assistant answer?",
    a: "Questions about the products in the catalog and about your own orders. Answers are generated automatically, so check important details on the product page.",
  },
  {
    q: "How do I follow an order?",
    a: "Open My orders. Each order shows its current status and the items inside it.",
  },
  {
    q: "Which currency are prices in?",
    a: "All prices are in Indian rupees.",
  },
  {
    q: "How are passwords stored?",
    a: "Passwords are never saved as plain text. They are hashed before they are stored.",
  },
];

function SectionShell({ id, title, intro, children }) {
  return (
    <Reveal as="section" aria-labelledby={id} className="mx-auto max-w-6xl px-4 py-16 md:px-6">
      <div className="mb-10 flex max-w-[680px] flex-col gap-3">
        <h2 id={id} className="heading-3">
          {title}
        </h2>
        {intro && <p className="body-3 text-muted">{intro}</p>}
      </div>
      {children}
    </Reveal>
  );
}

export function ProblemSolution() {
  return (
    <SectionShell id="problem-title" title="Not sure what a product is called? Describe it instead.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <p className="caption-3 text-subtle">Keywords only</p>
          <p className="body-3 text-muted">
            You type a product name and hope the store uses the same words. One different term and the item you want
            does not show up.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-raised p-6">
          <p className="caption-3 text-subtle">Smart search</p>
          <p className="body-3 text-muted">
            Describe what you need in a sentence. The search compares meaning, then lists the products in this store that
            fit.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

export function Benefits() {
  return (
    <SectionShell id="benefits-title" title="Built around how people actually shop">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-raised">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="heading-6">{title}</h3>
              <p className="body-6 text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

export function HowItWorks() {
  return (
    <SectionShell id="how-title" title="How it works">
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map(({ title, text }, index) => (
          <li key={title} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <span className="caption-3 flex size-8 items-center justify-center rounded-lg bg-raised">{index + 1}</span>
            <div className="flex flex-col gap-2">
              <h3 className="heading-6">{title}</h3>
              <p className="body-6 text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

// Mandatory tagline moment: a large statement whose words light up one at a time on scroll.
export function Tagline() {
  return (
    <section aria-label="Our promise" className="mx-auto max-w-6xl px-4 py-24 md:px-6">
      <WordReveal
        className="heading-2 max-w-[680px]"
        text="Say what you are looking for in plain words. We find the right products, hold your stock, and keep every order in view."
      />
    </section>
  );
}

export function Faq() {
  return (
    <SectionShell id="faq-title" title="Questions, answered">
      <div className="flex max-w-3xl flex-col gap-2">
        {faqs.map(({ q, a }) => (
          <details key={q} className="group rounded-xl border border-line bg-surface open:bg-raised">
            <summary className="title-3 flex items-center justify-between gap-4 rounded-xl px-4 py-4">
              {q}
              <CaretDown
                size={16}
                aria-hidden="true"
                className="shrink-0 text-subtle transition-transform duration-500 ease-brand group-open:rotate-180"
              />
            </summary>
            <p className="body-6 animate-fade-in px-4 pb-4 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

export function FinalCta() {
  return (
    <Reveal as="section" aria-labelledby="final-title" className="mx-auto max-w-6xl px-4 py-16 md:px-6">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface px-6 py-16 text-center">
        <div className="flex max-w-[680px] flex-col gap-3">
          <h2 id="final-title" className="heading-3">
            Ready to find what you need?
          </h2>
          <p className="title-2 text-muted">Describe it, add it to your cart, and follow it until it arrives.</p>
        </div>
        <Button as={Link} to="/shop" size="lg">
          Start shopping
          <ArrowRight size={20} aria-hidden="true" />
        </Button>
        <p className="caption-1 flex items-center gap-2 text-muted">
          <ShieldCheck size={16} aria-hidden="true" />
          Free account. Cancel any order before it ships.
        </p>
      </div>
    </Reveal>
  );
}
