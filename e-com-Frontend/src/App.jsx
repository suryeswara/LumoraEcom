import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./components/Home";
import Shop from "./components/Shop";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Cart from "./components/Cart";
import AddProduct from "./components/AddProduct";
import UpdateProduct from "./components/UpdateProduct";
import Product from "./components/Product";
import AskAi from "./components/AskAI";
import Order from "./components/Order";
import AuthPage from "./components/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import SearchResults from "./components/SearchResults";
import NotFound from "./components/NotFound";
import { Privacy, Terms } from "./components/Legal";
import AdminDashboard from "./components/admin/AdminDashboard";
import { Toaster } from "./ui/toast";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <a
        href="#main"
        className="button-sm sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-60 focus:rounded-lg focus:bg-fg focus:px-3 focus:py-2 focus:text-page"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className="min-h-screen pt-24 outline-none">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route
            path="/shop"
            element={
              <ProtectedRoute>
                <Shop />
              </ProtectedRoute>
            }
          />
          <Route
            path="/product/:id"
            element={
              <ProtectedRoute>
                <Product />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search-results"
            element={
              <ProtectedRoute>
                <SearchResults />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add_product"
            element={
              <ProtectedRoute adminOnly>
                <AddProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/product/update/:id"
            element={
              <ProtectedRoute adminOnly>
                <UpdateProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/askai"
            element={
              <ProtectedRoute>
                <AskAi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Order />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
