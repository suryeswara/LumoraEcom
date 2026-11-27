import { useState } from "react";
import { ImageSquare } from "@phosphor-icons/react";
import { toImageSrc } from "../lib/format";

// Shows the product photo, or a neutral tile when there is none (or it fails to load).
export default function ProductImage({ product, src, alt = "", className = "", iconSize = 32, fit = "cover" }) {
  const [failed, setFailed] = useState(false);
  const source = src || toImageSrc(product);

  if (!source || failed) {
    return (
      <div
        role="img"
        aria-label={alt ? `${alt}, no photo available` : "No photo available"}
        className={`flex items-center justify-center bg-raised text-subtle ${className}`}
      >
        <ImageSquare size={iconSize} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={source}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
    />
  );
}
