import { Link } from "react-router-dom";
import { ArrowRight, ImageSquare, MagnifyingGlass } from "@phosphor-icons/react";
import Button from "../../ui/Button";

const rows = [
  ["w-2/3", "w-1/3"],
  ["w-1/2", "w-1/4"],
  ["w-3/5", "w-1/3"],
];

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pb-8 pt-8 md:px-6">
      <div className="mx-auto flex max-w-[680px] flex-col items-center gap-6 text-center">
        <h1 id="hero-title" className="hero-heading heading-1">
          Shop by describing
          <br className="hidden sm:block" /> what you need
        </h1>
        <p className="title-2 max-w-[680px] text-muted">
          Type a sentence instead of guessing keywords. Smart search matches your words to real products, and you can
          follow or cancel every order from one place.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Button as={Link} to="/shop" size="lg">
            Start shopping
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
          <p className="caption-1 text-subtle">Log in or create a free account to browse the products.</p>
        </div>
      </div>

      {/* Illustration of the search experience. Decorative, so it is hidden from assistive technology. */}
      <figure className="mx-auto mt-16 w-full max-w-2xl">
        <div aria-hidden="true" className="rounded-2xl border border-line bg-surface p-2">
          <div className="flex items-center gap-3 rounded-lg bg-raised px-4 py-3">
            <MagnifyingGlass size={20} className="shrink-0 text-subtle" />
            <span className="body-3 truncate">A light laptop for travel with a long lasting battery</span>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {rows.map(([top, bottom], index) => (
              <li key={index} className="flex items-center gap-4 rounded-lg bg-raised p-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-hover text-subtle">
                  <ImageSquare size={24} />
                </span>
                <span className="flex flex-1 flex-col gap-2">
                  <span className={`block h-3 rounded-lg bg-hover ${top}`} />
                  <span className={`block h-3 rounded-lg bg-hover ${bottom}`} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <figcaption className="caption-2 mt-4 text-center text-subtle">
          Smart search matches meaning, not only keywords.
        </figcaption>
      </figure>
    </section>
  );
}
