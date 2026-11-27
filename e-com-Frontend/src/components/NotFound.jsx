import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "@phosphor-icons/react";
import Button from "../ui/Button";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="mx-auto flex min-h-96 max-w-xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-raised text-muted">
        <Compass size={24} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <p className="caption-1 text-subtle">Error 404</p>
        <h1 className="heading-3">This page does not exist</h1>
        <p className="body-3 text-muted">
          The link may be broken or the page may have moved. Head back to the shop to keep browsing.
        </p>
      </div>
      <Button as={Link} to="/">
        <ArrowLeft size={20} aria-hidden="true" />
        Back to the shop
      </Button>
    </div>
  );
}
