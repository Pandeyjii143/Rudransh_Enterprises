import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { orderAPI, paymentAPI, handleApiError } from "../services/api";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_example";

function Payment() {
  const { orderId } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [order, setOrder] = useState(null);
  const [billingInfo, setBillingInfo] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ")[1] || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(null);

  useEffect(() => {
    if (window.Razorpay) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setScriptError("Unable to load payment gateway. Please refresh the page.");
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (orderId && token) {
      fetchOrderDetails();
    }
  }, [orderId, token]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await orderAPI.getById(orderId);
      setOrder(response.data);
    } catch (error) {
      setPaymentStatus({
        type: "error",
        message: handleApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBillingChange = (e) => {
    setBillingInfo({
      ...billingInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setPaymentStatus(null);

    if (!order) {
      setPaymentStatus({ type: "error", message: "Unable to load the order. Please try again." });
      setProcessing(false);
      return;
    }

    if (!billingInfo.firstName || !billingInfo.email || !billingInfo.phone) {
      setPaymentStatus({ type: "error", message: "Please provide complete billing information." });
      setProcessing(false);
      return;
    }

    if (!scriptLoaded || scriptError) {
      setPaymentStatus({ type: "error", message: scriptError || "Payment gateway is not ready." });
      setProcessing(false);
      return;
    }

    try {
      const createResponse = await paymentAPI.createOrder(order.id);
      const paymentOrder = createResponse.data;

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "Rudransh Enterprises",
        description: `Order #${order.id}`,
        order_id: paymentOrder.orderId,
        prefill: {
          name: `${billingInfo.firstName} ${billingInfo.lastName}`.trim(),
          email: billingInfo.email,
          contact: billingInfo.phone,
        },
        notes: {
          orderId: order.id,
        },
        theme: {
          color: "#ffb347",
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setPaymentStatus({ type: "error", message: "Payment was cancelled." });
          },
        },
        handler: async (response) => {
          try {
            await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order.id,
            });

            setPaymentStatus({
              type: "success",
              message: "Payment successful! Redirecting to tracking...",
            });
            setTimeout(() => navigate(`/tracking/${order.id}`), 1400);
          } catch (verifyError) {
            setPaymentStatus({
              type: "error",
              message: handleApiError(verifyError),
            });
          } finally {
            setProcessing(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      setPaymentStatus({ type: "error", message: handleApiError(error) });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-page">
        <div className="loading glass-card">
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="payment-page">
        <div className="error glass-card">
          <p>Order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <h1>Complete Payment</h1>

        <div className="payment-grid">
          <div className="order-summary-section glass-card">
            <h2>Order Details</h2>

            <div className="order-reference">
              <div className="reference-row">
                <span>Order ID:</span>
                <span className="value">#{order.id}</span>
              </div>
              <div className="reference-row">
                <span>Date:</span>
                <span className="value">{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="payment-items">
              {order.items?.map((item) => (
                <div key={item.id} className="payment-item">
                  <img
                    src={item.image || "https://via.placeholder.com/200x150?text=Product"}
                    alt={item.name}
                  />
                  <div className="payment-item-content">
                    <h4>{item.name}</h4>
                    <p className="qty">Qty: {item.quantity}</p>
                  </div>
                  <div className="payment-item-price">
                    ₹{Number(item.price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="payment-breakdown">
              <div className="breakdown-row">
                <span>Subtotal:</span>
                <span>₹{Number(order.total_amount).toLocaleString()}</span>
              </div>
              <div className="breakdown-row">
                <span>Shipping:</span>
                <span>FREE</span>
              </div>
              <div className="breakdown-row">
                <span>Tax:</span>
                <span>₹0</span>
              </div>
              <div className="breakdown-row total">
                <span>Total Amount:</span>
                <span>₹{Number(order.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handlePayment} className="payment-form-section glass-card">
            <h2>Payment Details</h2>

            {paymentStatus && (
              <div className={`payment-status ${paymentStatus.type}`}>
                {paymentStatus.message}
              </div>
            )}

            <div className="form-section">
              <h3>Billing Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    value={billingInfo.firstName}
                    onChange={handleBillingChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    value={billingInfo.lastName}
                    onChange={handleBillingChange}
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
                    value={billingInfo.email}
                    onChange={handleBillingChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={billingInfo.phone}
                    onChange={handleBillingChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Payment Method</h3>
              <div className="payment-methods">
                <label className="payment-method">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="method-label">💳 Credit/Debit Card</span>
                </label>
                <label className="payment-method">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={paymentMethod === "upi"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="method-label">📱 UPI</span>
                </label>
                <label className="payment-method">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="netbanking"
                    checked={paymentMethod === "netbanking"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="method-label">🏦 Net Banking</span>
                </label>
              </div>
            </div>

            <div className="form-section">
              <p>
                Your payment is processed securely by Razorpay. Once you continue,
                you will be taken to a secure payment checkout.
              </p>
            </div>

            <button type="submit" disabled={processing} className="btn pay-btn">
              {processing ? "Redirecting to payment..." : `Pay ₹${Number(order.total_amount).toLocaleString()}`}
            </button>

            <p className="payment-note">
              🔒 Your payment information is secure and encrypted.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Payment;
