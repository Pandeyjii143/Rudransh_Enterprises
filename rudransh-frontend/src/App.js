import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import InstallationBooking from "./pages/InstallationBooking";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import ProductDetails from "./pages/ProductDetails";
import OrderHistory from "./pages/OrderHistory";
import Tracking from "./pages/Tracking";
import Payment from "./pages/Payment";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import About from "./pages/About";

import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";

import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import WhatsAppButton from "./components/WhatsAppButton";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <div className="app-layout">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="main-content">
                  <Navbar onToggleSidebar={toggleSidebar} />

                  <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/shop" element={<Shop />} />

              <Route path="/product/:id" element={<ProductDetails />} />

              <Route path="/cart" element={<Cart />} />

              <Route path="/checkout" element={<Checkout />} />

              <Route path="/installation" element={<InstallationBooking />} />

              <Route path="/orders" element={<OrderHistory />} />

              <Route path="/tracking/:orderId" element={<Tracking />} />

              <Route path="/login" element={<Login />} />

              <Route path="/register" element={<Register />} />

              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route path="/payment/:orderId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />

              <Route path="/terms" element={<Terms />} />

              <Route path="/privacy" element={<Privacy />} />

              <Route path="/about" element={<About />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>

                <Footer />
              </div>
            </div>
            <WhatsAppButton />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
