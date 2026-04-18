import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

function OrderHistory() {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to load orders");
      }
    } catch (err) {
      setError("Error loading orders");
      console.error("Failed to fetch orders", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#ffa500",
      confirmed: "#007bff",
      shipped: "#28a745",
      delivered: "#28a745",
      cancelled: "#dc3545",
    };
    return colors[status] || "#6c757d";
  };

  if (loading) {
    return <div className="order-history">Loading your orders...</div>;
  }

  if (error) {
    return <div className="order-history">Error: {error}</div>;
  }

  return (
    <div className="order-history">
      <h1>My Orders</h1>

      {orders.length === 0 ? (
        <div className="no-orders">
          <h2>No orders yet</h2>
          <p>You haven't placed any orders yet.</p>
          <Link to="/shop">
            <button className="btn hero-btn">Start Shopping</button>
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card glass-card">
              <div className="order-header">
                <h3>Order #{order.id}</h3>
                <span
                  className="order-status"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status}
                </span>
              </div>

              <div className="order-details">
                <p><strong>Total:</strong> ₹{order.total_amount}</p>
                <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                {order.tracking_number && (
                  <p><strong>Tracking:</strong> {order.tracking_number} ({order.carrier})</p>
                )}
              </div>

              <div className="order-actions">
                <Link to={`/tracking/${order.id}`}>
                  <button className="btn outline-btn">Track Order</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderHistory;