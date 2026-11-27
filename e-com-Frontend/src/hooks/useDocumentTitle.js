import { useEffect } from "react";
import { BRAND } from "../config/brand";

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${BRAND.name}` : `${BRAND.name} | ${BRAND.tagline}`;
  }, [title]);
}
