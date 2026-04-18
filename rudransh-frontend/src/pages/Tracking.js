import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import io from "socket.io-client";
import apiClient, { orderAPI } from "../services/api";

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/api$/, "") || window.location.origin;

function Tracking() {
  const { orderId } = useParams();
  const { token } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (orderId && token) {
      fetchOrderDetails();
      setupSocketConnection();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [orderId, token]);

  const setupSocketConnection = () => {
    const socketUrl = API_URL;
    const newSocket = io(socketUrl);
    newSocket.emit("join-order", orderId);
    newSocket.emit("join-tracking", orderId);

    newSocket.on("tracking-update", (update) => {
      console.log("Real-time tracking update:", update);
      fetchTrackingData();
    });

    setSocket(newSocket);
  };

  const fetchOrderDetails = async () => {
    try {
      const response = await orderAPI.getById(orderId);
      setOrder(response.data);
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const fetchTrackingData = async () => {
    try {
      const response = await apiClient.get(`/tracking/${orderId}`);
      setTracking(response.data);
    } catch (error) {
      console.error("Error fetching tracking data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId && token) {
      fetchTrackingData();
    }
  }, [orderId, token]);

  const getStatusColor = (status) => {
    const colors = {
      pending: "#ffa500",
      confirmed: "#007bff",
      shipped: "#28a745",
      out_for_delivery: "#17a2b8",
      delivered: "#28a745",
    };
    return colors[status] || "#6c757d";
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: "⏳",
      confirmed: "✅",
      shipped: "📦",
      out_for_delivery: "🚚",
      delivered: "🎉",
    };
    return icons[status] || "📋";
  };

  if (loading) {
    return <div className="tracking">Loading tracking information...</div>;
  }

  if (!order || !tracking) {
    return (
      <div className="tracking">Order or tracking information not found</div>
    );
  }

  return (
    <div className="tracking">
      <h2>Order Tracking</h2>

      <div className="tracking-header">
        <div className="order-info">
          <h3>Order #{order.id}</h3>
          <p>
            Status:{" "}
            <span style={{ color: getStatusColor(order.status) }}>
              {order.status}
            </span>
          </p>
          <p>Total: ₹{order.total_amount}</p>
        </div>

        {tracking.tracking_number && (
          <div className="tracking-info">
            <h3>Tracking Details</h3>
            <p>
              <strong>Tracking Number:</strong> {tracking.tracking_number}
            </p>
            <p>
              <strong>Carrier:</strong> {tracking.carrier}
            </p>
            <p>
              <strong>Estimated Delivery:</strong>{" "}
              {new Date(tracking.estimated_delivery).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="tracking-timeline">
        <h3>Tracking Timeline</h3>
        <div className="timeline">
          {tracking.updates?.map((update, index) => (
            <div key={index} className="timeline-item">
              <div
                className="timeline-marker"
                style={{ backgroundColor: getStatusColor(update.status) }}
              >
                {getStatusIcon(update.status)}
              </div>
              <div className="timeline-content">
                <h4>{update.description}</h4>
                <p>{update.location}</p>
                <small>{new Date(update.timestamp).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="order-items">
        <h3>Order Items</h3>
        {order.items?.map((item) => (
          <div key={item.id} className="order-item">
            <img src={item.image} alt={item.name} />
            <div>
              <h4>{item.name}</h4>
              <p>Quantity: {item.quantity}</p>
              <p>Price: ₹{item.price}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="delivery-address">
        <h3>Delivery Address</h3>
        <p>{order.shipping_address}</p>
        <p>Phone: {order.phone}</p>
      </div>
    </div>
  );
}

export default Tracking;
