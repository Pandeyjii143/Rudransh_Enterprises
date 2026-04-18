import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

function AdminDashboard() {
  const { token } = useContext(AuthContext);
  const { theme } = useTheme();
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState({
    name: "",
    price: "",
    category: "",
    image: "",
    channel: "",
    stock: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Section management state
  const [sections, setSections] = useState([]);
  const [section, setSection] = useState({
    name: "",
    description: "",
  });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [showSectionDeleteConfirm, setShowSectionDeleteConfirm] = useState(null);

  // Orders management state
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState("all");

  useEffect(() => {
    fetchProducts();
    fetchSections();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await fetch(`${API_BASE}/sections`);
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (err) {
      console.error("Failed to fetch sections", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/orders`);
      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setOrders([]);
    }
  };

  const handleChange = (e) => {
    setProduct({
      ...product,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
  };

  const uploadImage = async () => {
    if (!uploadFile) return null;
    const formData = new FormData();
    formData.append("file", uploadFile);
    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    let imageUrl = product.image;
    if (uploadFile) {
      imageUrl = await uploadImage();
      if (!imageUrl) {
        setMessage("Image upload failed");
        setIsLoading(false);
        return;
      }
    }

    const payload = {
      name: product.name,
      price: parseFloat(product.price),
      category: product.category,
      image: imageUrl,
      channel: product.channel || null,
      stock: parseInt(product.stock) || 0,
    };

    try {
      const url = editingId
        ? `${API_BASE}/products/${editingId}`
        : `${API_BASE}/products`;
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      setMessage(
        editingId
          ? "Product updated successfully!"
          : "Product added successfully!",
      );
      setProduct({
        name: "",
        price: "",
        category: "",
        image: "",
        channel: "",
        stock: "",
      });
      setEditingId(null);
      setUploadFile(null);
      fetchProducts();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (prod) => {
    setProduct({
      name: prod.name,
      price: prod.price.toString(),
      category: prod.category,
      image: prod.image || "",
      channel: prod.channel || "",
      stock: prod.stock.toString(),
    });
    setEditingId(prod.id);
    setUploadFile(null);
  };

  const handleDelete = async (id) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    const id = showDeleteConfirm;
    setShowDeleteConfirm(null);
    try {
      const response = await fetch(`${API_BASE}/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setMessage("Product deleted successfully!");
        fetchProducts();
      } else {
        setMessage("Failed to delete product");
      }
    } catch (err) {
      setMessage("Error deleting product");
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // Section management functions
  const handleSectionChange = (e) => {
    setSection({
      ...section,
      [e.target.name]: e.target.value,
    });
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const payload = {
      name: section.name,
      description: section.description || null,
    };

    try {
      const url = editingSectionId
        ? `${API_BASE}/sections/${editingSectionId}`
        : `${API_BASE}/sections`;
      const method = editingSectionId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save section");
      }

      setMessage(
        editingSectionId
          ? "Section updated successfully!"
          : "Section added successfully!",
      );
      setSection({
        name: "",
        description: "",
      });
      setEditingSectionId(null);
      fetchSections();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleSectionEdit = (sec) => {
    setSection({
      name: sec.name,
      description: sec.description || "",
    });
    setEditingSectionId(sec.id);
  };

  const handleSectionDelete = async (id) => {
    setShowSectionDeleteConfirm(id);
  };

  const confirmSectionDelete = async () => {
    const id = showSectionDeleteConfirm;
    setShowSectionDeleteConfirm(null);
    try {
      const response = await fetch(`${API_BASE}/sections/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setMessage("Section deleted successfully!");
        fetchSections();
      } else {
        setMessage("Failed to delete section");
      }
    } catch (err) {
      setMessage("Error deleting section");
    }
  };

  const cancelSectionDelete = () => {
    setShowSectionDeleteConfirm(null);
  };

  const totalSales = products.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalOrders = Math.max(1, products.length * 2);
  const totalUsers = totalOrders + 5;

  return (
    <div className="admin-wrapper" style={{ backgroundColor: theme.background, color: theme.text }}>
      <aside className="admin-sidebar" style={{ backgroundColor: theme.surface }}>
        <div className="admin-brand">
          <h2>Rudransh</h2>
          <p>Admin Panel</p>
        </div>
        <nav className="sidebar-nav">
          <button className="active">Overview</button>
          <button>Products</button>
          <button>Orders</button>
          <button>Users</button>
        </nav>
      </aside>

      <main className="admin-content glass-card" style={{ backgroundColor: theme.surface }}>
        <header className="admin-header">
          <div>
            <h2>Rudransh Dashboard</h2>
            <p>Manage products, orders, users and track performance</p>
          </div>
        </header>

        <div className="admin-cards-grid">
          <div className="stat-card">
            <h4>Total Sales</h4>
            <p>₹{totalSales.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h4>Orders</h4>
            <p>{totalOrders}</p>
          </div>
          <div className="stat-card">
            <h4>Users</h4>
            <p>{totalUsers}</p>
          </div>
        </div>

        <section className="admin-section glass-card">
          <h3>{editingId ? "Edit Product" : "Add Product"}</h3>

          <form onSubmit={handleSubmit} className="admin-form">
            <input
              name="name"
              placeholder="Product Name"
              value={product.name}
              onChange={handleChange}
              required
            />

            <input
              name="price"
              type="number"
              step="0.01"
              placeholder="Price"
              value={product.price}
              onChange={handleChange}
              required
            />

            <input
              name="category"
              placeholder="Category (e.g., Camera, Storage)"
              value={product.category}
              onChange={handleChange}
              required
            />

            <input
              name="image"
              placeholder="Image URL (optional)"
              value={product.image}
              onChange={handleChange}
            />

            <input type="file" accept="image/*" onChange={handleFileChange} />

            <input
              name="channel"
              placeholder="Channel (optional, for NVR)"
              value={product.channel}
              onChange={handleChange}
            />

            <input
              name="stock"
              type="number"
              placeholder="Stock Quantity"
              value={product.stock}
              onChange={handleChange}
              required
            />

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : editingId ? "Update Product" : "Add Product"}
            </button>

            {editingId && (
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setEditingId(null);
                  setProduct({
                    name: "",
                    price: "",
                    category: "",
                    image: "",
                    channel: "",
                    stock: "",
                  });
                  setUploadFile(null);
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>

          {message && <p className="message">{message}</p>}
        </section>

        <section className="admin-section">
          <h3>Product Catalog</h3>

          <div className="product-list">
            {products.map((prod) => (
              <div key={prod.id} className="product-item">
                <img
                  src={prod.image}
                  alt={prod.name}
                  style={{ width: "50px", height: "50px", objectFit: "cover" }}
                />
                <div>
                  <h4>{prod.name}</h4>
                  <p>₹{prod.price} | Stock: {prod.stock}</p>
                </div>
                <div className="item-actions">
                  <button onClick={() => handleEdit(prod)}>Edit</button>
                  <button onClick={() => handleDelete(prod.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {showDeleteConfirm && (
          <div className="confirm-modal">
            <p>Are you sure you want to delete this product?</p>
            <button onClick={confirmDelete}>Yes</button>
            <button onClick={cancelDelete}>No</button>
          </div>
        )}

        <section className="admin-section">
          <h3>{editingSectionId ? "Edit Section" : "Add Section"}</h3>
          <form onSubmit={handleSectionSubmit} className="admin-form">
            <input
              name="name"
              placeholder="Section Name (e.g., Cameras, Laptops)"
              value={section.name}
              onChange={handleSectionChange}
              required
            />
            <input
              name="description"
              placeholder="Description (optional)"
              value={section.description}
              onChange={handleSectionChange}
            />
            <button type="submit">{editingSectionId ? "Update Section" : "Add Section"}</button>
            {editingSectionId && (
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setEditingSectionId(null);
                  setSection({ name: "", description: "" });
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>

          <h3>Manage Sections</h3>
          <div className="section-list">
            {sections.map((sec) => (
              <div key={sec.id} className="section-item">
                <div>
                  <h4>{sec.name}</h4>
                  <p>{sec.description || "No description"}</p>
                </div>
                <div className="item-actions">
                  <button onClick={() => handleSectionEdit(sec)}>Edit</button>
                  <button onClick={() => handleSectionDelete(sec.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <h3>Orders Management</h3>
          <div className="filter-controls">
            <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}>
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="orders-list">
            {orders.length === 0 ? (
              <p>No orders found.</p>
            ) : (
              orders
                .filter((o) => orderFilter === "all" || o.status === orderFilter)
                .map((order) => (
                  <div key={order.id} className="order-item">
                    <div className="order-header">
                      <h4>Order #{order.id}</h4>
                      <span className={`order-status status-${order.status}`}>{order.status}</span>
                    </div>
                    <div className="order-details">
                      <p><strong>Customer:</strong> {order.customer_name || "N/A"}</p>
                      <p><strong>Total:</strong> ₹{order.total || 0}</p>
                      <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>

        {showSectionDeleteConfirm && (
          <div className="confirm-modal">
            <p>Are you sure you want to delete this section? This will affect all products in this section.</p>
            <button onClick={confirmSectionDelete}>Yes</button>
            <button onClick={cancelSectionDelete}>No</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
