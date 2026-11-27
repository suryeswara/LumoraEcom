import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import { Input } from "../ui/Field";

const EXAMPLES = ["A light laptop for travel", "Headphones for long flights", "A gift for a five year old"];

export default function SearchDialog({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const search = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onClose();
    setQuery("");
    navigate(`/search-results?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Search products"
      description="Describe what you need in a sentence. Smart search matches the meaning, not only the keywords."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          search(query);
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex gap-2">
          <Input
            id="smart-search"
            type="search"
            data-autofocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="For example, a quiet keyboard for the office"
            aria-label="Describe what you are looking for"
            maxLength={200}
          />
          <Button type="submit" disabled={!query.trim()}>
            <MagnifyingGlass size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <p className="caption-1 text-subtle">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Button key={example} variant="secondary" size="sm" onClick={() => search(example)}>
                {example}
              </Button>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
