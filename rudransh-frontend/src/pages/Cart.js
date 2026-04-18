import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";

function Cart() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    cartTotal,
    cartItemCount,
  } = useContext(CartContext);
  const navigate = useNavigate();

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="empty-cart glass-card">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your Cart is Empty</h2>
            <p>Add some products to get started!</p>
            <button onClick={() => navigate("/shop")} className="btn hero-btn">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h1>Shopping Cart</h1>
          <p className="cart-count">
            {cartItemCount} item{cartItemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>

        <div className="cart-layout">
          <div className="cart-items-section glass-card">
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item-card">
                  <div className="cart-item-image">
                    <img src={item.image} alt={item.name} />
                  </div>

                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <p className="item-category">{item.category || "Electronics"}</p>
                    <p className="item-price">₹{item.price.toLocaleString()}</p>
                  </div>

                  <div className="quantity-controls">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="qty-btn"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.stock || 10}
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(
                          item.id,
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="qty-input"
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= (item.stock || 100)}
                      className="qty-btn"
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    <p className="total-price">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="remove-btn"
                    title="Remove item"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="cart-summary glass-card">
            <h2>Order Summary</h2>

            <div className="summary-details">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span className="amount">₹{cartTotal.toLocaleString()}</span>
              </div>

              <div className="summary-row">
                <span>Shipping:</span>
                <span className="amount free">FREE</span>
              </div>

              <div className="summary-row">
                <span>Tax (0%):</span>
                <span className="amount">₹0</span>
              </div>

              <div className="summary-row-divider"></div>

              <div className="summary-row total">
                <span>Total:</span>
                <span className="amount">₹{cartTotal.toLocaleString()}</span>
              </div>

              <div className="savings">
                You're saving money with our best prices! 💰
              </div>
            </div>

            <div className="cart-actions">
              <button
                onClick={() => navigate("/checkout")}
                className="btn hero-btn checkout-btn"
              >
                Proceed to Checkout →
              </button>
              <button
                onClick={() => navigate("/shop")}
                className="btn continue-btn"
              >
                ← Continue Shopping
              </button>
            </div>

            <div className="security-note">
              <p>🔒 Secure checkout protected by encryption</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
