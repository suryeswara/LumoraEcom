import { useContext, useMemo } from "react";
import AppContext from "../Context/Context";
import useDocumentTitle from "../hooks/useDocumentTitle";
import Catalog from "./Catalog";

// The shopping page. Only reachable after login (see the route in App.jsx).
const Shop = () => {
  useDocumentTitle("Shop");
  const { data } = useContext(AppContext);

  const categories = useMemo(
    () => [...new Set(data.map((product) => product.category).filter(Boolean))].sort(),
    [data]
  );

  return <Catalog categories={categories} />;
};

export default Shop;
