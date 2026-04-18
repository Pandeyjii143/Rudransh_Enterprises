import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";

function Checkout() {
  const { cartItems, cartTotal, checkout } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    zipCode: user?.zipCode || "",
  });

  const handleInputChange = (e) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shippingInfo.phone || !shippingInfo.address || !shippingInfo.city) {
      alert("Please fill in all required shipping information");
      return;
    }

    setLoading(true);
    try {
      const result = await checkout(shippingInfo.address, shippingInfo.phone);
      navigate(`/payment/${result.orderId}`);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="empty-checkout glass-card">
          <h2>Your cart is empty</h2>
          <p>Add some products to proceed with checkout</p>
          <button onClick={() => navigate("/shop")} className="btn hero-btn">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Checkout</h1>

        <div className="checkout-grid">
          <div className="order-summary glass-card">
            <h2>Order Summary</h2>
            <div className="checkout-items">
              {cartItems.map((item) => (
                <div key={item.id} className="checkout-item">
                  <img src={item.image} alt={item.name} />
                  <div className="checkout-item-details">
                    <h4>{item.name}</h4>
                    <p className="price">₹{item.price.toLocaleString()}</p>
                    <p className="quantity">Qty: {item.quantity}</p>
                  </div>
                  <div className="checkout-item-total">
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="checkout-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>FREE</span>
              </div>
              <div className="summary-row">
                <span>Tax (0%):</span>
                <span>₹0</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>₹{cartTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="shipping-form glass-card">
            <h2>Shipping Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={shippingInfo.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={shippingInfo.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="john@example.com"
                  value={shippingInfo.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={shippingInfo.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="address">Street Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                placeholder="123 Main Street"
                value={shippingInfo.address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  placeholder="New York"
                  value={shippingInfo.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">State/Province</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  placeholder="NY"
                  value={shippingInfo.state}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="zipCode">Zip Code</label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  placeholder="10001"
                  value={shippingInfo.zipCode}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn hero-btn full-width">
              {loading ? "Processing..." : "Proceed to Payment →"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="btn back-btn"
            >
              ← Back to Cart
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
