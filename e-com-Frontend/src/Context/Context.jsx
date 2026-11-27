import axios from "../axios";
import { useState, useEffect, useCallback, useContext, createContext } from "react";
import AuthContext from "./AuthContext";

const AppContext = createContext({
  data: [],
  isError: "",
  isLoading: true,
  cart: [],
  addToCart: () => false,
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  refreshData: () => {},
});

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("cart"));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export const AppProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [isError, setIsError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState(readCart);
  const { isAuthenticated } = useContext(AuthContext);
  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Products are only loaded for a logged in user, and are forgotten on logout.
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setData([]);
      setIsError("");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/api/products`);
      setData(response.data);
      setIsError("");
    } catch (error) {
      setIsError(error.message || "Could not load products");
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, isAuthenticated]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // A cart belongs to a logged in customer: logging out empties it.
  useEffect(() => {
    if (!isAuthenticated) setCart([]);
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Returns false when the item is already at its stock limit.
  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing && existing.quantity >= product.stockQuantity) return false;
    if (existing) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      // Keep only what the cart needs. Images are looked up from the product list by id.
      const { id, name, brand, price, stockQuantity } = product;
      setCart([...cart, { id, name, brand, price, stockQuantity, quantity: 1 }]);
    }
    return true;
  };

  const removeFromCart = (productId) => {
    setCart((current) => current.filter((item) => item.id !== Number(productId)));
  };

  const updateQuantity = (productId, quantity) => {
    setCart((current) =>
      current.map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  };

  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider
      value={{ data, isError, isLoading, cart, addToCart, removeFromCart, updateQuantity, clearCart, refreshData }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
