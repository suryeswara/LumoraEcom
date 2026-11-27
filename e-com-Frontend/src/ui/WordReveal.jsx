import { useEffect, useRef, useState } from "react";

// Tagline reveal: every word moves from a muted tone (30% of the text color) to full color,
// one at a time, as it crosses a trigger line 60% of the way down the viewport.
export default function WordReveal({ text, className = "" }) {
  const words = text.split(" ");
  const refs = useRef([]);
  const [active, setActive] = useState(() => new Set());

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      setActive(new Set(words.map((_, index) => index)));
      return undefined;
    }

    const trigger = () => window.innerHeight * 0.6;
    const observers = refs.current.map((element, index) => {
      if (!element) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          // Active once the word is above the trigger line, including after it has scrolled off the top.
          const passed = entry.boundingClientRect.top <= trigger();
          setActive((previous) => {
            if (previous.has(index) === passed) return previous;
            const next = new Set(previous);
            if (passed) next.add(index);
            else next.delete(index);
            return next;
          });
        },
        { rootMargin: "0px 0px -40% 0px", threshold: [0, 1] }
      );
      observer.observe(element);
      return observer;
    });

    return () => observers.forEach((observer) => observer?.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <p className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className={`transition-colors duration-500 ease-brand ${active.has(index) ? "text-fg" : "text-fg/30"}`}
        >
          {word}
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
