import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import apiClient from "../services/api";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const { accessToken } = useContext(AuthContext);

  useEffect(() => {
    const savedCart = localStorage.getItem("rudransh_cart");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("rudransh_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems((current) => {
      const existingItem = current.find((item) => item.id === product.id);
      if (existingItem) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...current, { ...product, quantity }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems((current) => current.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCartItems((current) =>
        current.map((item) => (item.id === id ? { ...item, quantity } : item)),
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const cartItemCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const checkout = async (shippingAddress, phone) => {
    if (!accessToken) {
      throw new Error("Please login to continue with checkout.");
    }

    const items = cartItems.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    const response = await apiClient.post("/orders/checkout", {
      items,
      shippingAddress,
      phone,
    });

    clearCart();
    return response.data;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartItemCount,
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
