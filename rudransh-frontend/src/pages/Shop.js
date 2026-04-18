import { useState, useContext, useMemo, useEffect, useCallback } from "react";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";

function Shop() {
  const { addToCart, cartItems } = useContext(CartContext);
  const { isAdmin } = useContext(AuthContext);
  const [selectedSection, setSelectedSection] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [toasts, setToasts] = useState([]);
  const productsPerPage = 12;

  // Toast notification functions
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };
    setToasts(prev => [...prev, toast]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Loading skeleton component
  const ProductSkeleton = () => (
    <div className="product-card skeleton-card">
      <div className="card-image-wrap skeleton"></div>
      <div className="product-info">
        <div className="skeleton skeleton-text long"></div>
        <div className="skeleton skeleton-text short"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
        <div className="skeleton add-to-cart-btn"></div>
      </div>
    </div>
  );

  const getFallbackImage = (category) => {
    const map = {
      Cameras: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80',
      NVR: 'https://images.unsplash.com/photo-1551836022-2b48a2d4d2cf?auto=format&fit=crop&w=900&q=80',
      Laptops: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
      Monitors: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
      Accessories: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80',
      Storage: 'https://images.unsplash.com/photo-1591375271052-7bd6d1b3db65?auto=format&fit=crop&w=900&q=80',
      DVR: 'https://images.unsplash.com/photo-1540212560-354b23c89c5a?auto=format&fit=crop&w=900&q=80',
    };
    return map[category] || 'https://images.unsplash.com/photo-1551817958-20204bb4e2d4?auto=format&fit=crop&w=900&q=80';
  };

  const fetchSections = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8000/api/sections");
      if (response.ok) {
        const data = await response.json();
        setSections([
          { id: "all", name: "All", description: "All products" },
          ...data,
        ]);
      } else {
        // Fallback sections if backend unavailable
        setSections([
          { id: "all", name: "All", description: "All products" },
          { id: "1", name: "IP Camera", description: "Network IP Cameras" },
          { id: "2", name: "CCTV Camera", description: "CCTV Surveillance Cameras" },
          { id: "3", name: "DVR", description: "Digital Video Recorders" },
          { id: "4", name: "NVR", description: "Network Video Recorders" },
          { id: "5", name: "Monitor", description: "Display Monitors" },
          { id: "6", name: "Laptop", description: "Business & Gaming Laptops" },
          { id: "7", name: "Hard Disk", description: "Storage Drives" },
        ]);
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
      // Fallback sections
      setSections([
        { id: "all", name: "All", description: "All products" },
        { id: "1", name: "Cameras", description: "CCTV & IP Cameras" },
        { id: "2", name: "Laptops", description: "Business & Gaming" },
        { id: "3", name: "Monitors", description: "Display Monitors" },
        { id: "4", name: "Storage", description: "Drives & SSDs" },
        { id: "5", name: "Accessories", description: "Keyboards & Mice" },
      ]);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: productsPerPage.toString(),
        offset: "0",
        search: searchQuery,
        ...(selectedSection !== "All" && { section: selectedSection }),
        ...(priceRange.min && { min_price: priceRange.min }),
        ...(priceRange.max && { max_price: priceRange.max }),
        ...(selectedBrands.length > 0 && { brand: selectedBrands[0] }),
      });

      const response = await fetch(
        `http://localhost:8000/api/products?${params}`,
      );
      if (response.ok) {
        const data = await response.json();
        let fetchedProducts = Array.isArray(data) ? data : data.products || [];
        if (fetchedProducts.length === 0) {
          // Fallback to demo products if no products from API
          fetchedProducts = [
            { id: 1, name: "Hikvision 2MP IP Camera", price: 4500, category: "IP Camera", section_name: "IP Camera", image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=80", stock: 15, brand: "Hikvision", description: "2MP resolution, night vision, weatherproof design for outdoor surveillance" },
            { id: 2, name: "CP Plus 4MP CCTV Camera", price: 3200, category: "CCTV Camera", section_name: "CCTV Camera", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80", stock: 20, brand: "CP Plus", description: "4MP bullet camera with IR night vision and motion detection" },
            { id: 3, name: "Dahua 8 Channel DVR", price: 8500, category: "DVR", section_name: "DVR", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=900&q=80", stock: 10, brand: "Dahua", description: "8 channel DVR with H.265 compression and remote viewing capability" },
            { id: 4, name: "Uniview 16 Channel NVR", price: 12500, category: "NVR", section_name: "NVR", image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=900&q=80", stock: 8, brand: "Uniview", description: "16 channel NVR with 4K recording and AI-powered analytics" },
            { id: 5, name: "Samsung 27-inch 4K Monitor", price: 18500, category: "Monitor", section_name: "Monitor", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80", stock: 12, brand: "Samsung", description: "27-inch 4K UHD monitor with HDR10 and USB-C connectivity" },
            { id: 6, name: "Dell Inspiron 15 Laptop", price: 52000, category: "Laptop", section_name: "Laptop", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80", stock: 6, brand: "Dell", description: "15.6-inch laptop with Intel i5, 8GB RAM, 512GB SSD" },
            { id: 7, name: "Western Digital 1TB HDD", price: 4200, category: "Hard Disk", section_name: "Hard Disk", image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80", stock: 25, brand: "Western Digital", description: "1TB internal hard disk drive with 7200 RPM and 64MB cache" },
            { id: 8, name: "TP-Link 5MP IP Camera", price: 3800, category: "IP Camera", section_name: "IP Camera", image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=900&q=80", stock: 18, brand: "TP-Link", description: "5MP IP camera with pan-tilt-zoom and two-way audio" },
            { id: 9, name: "Godrej 2MP Dome CCTV", price: 2900, category: "CCTV Camera", section_name: "CCTV Camera", image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=80", stock: 22, brand: "Godrej", description: "2MP dome camera with varifocal lens and smart IR technology" },
            { id: 10, name: "Seagate 2TB External HDD", price: 6500, category: "Hard Disk", section_name: "Hard Disk", image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80", stock: 14, brand: "Seagate", description: "2TB portable hard disk with USB 3.0 and shock resistance" },
          ];
        }
        setProducts(fetchedProducts);
        setError(null);
      } else {
        // Fallback to demo products
        const demoProducts = [
          { id: 1, name: "Hikvision 2MP IP Camera", price: 4500, category: "IP Camera", section_name: "IP Camera", image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=80", stock: 15, brand: "Hikvision", description: "2MP resolution, night vision, weatherproof design for outdoor surveillance" },
          { id: 2, name: "CP Plus 4MP CCTV Camera", price: 3200, category: "CCTV Camera", section_name: "CCTV Camera", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80", stock: 20, brand: "CP Plus", description: "4MP bullet camera with IR night vision and motion detection" },
          { id: 3, name: "Dahua 8 Channel DVR", price: 8500, category: "DVR", section_name: "DVR", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=900&q=80", stock: 10, brand: "Dahua", description: "8 channel DVR with H.265 compression and remote viewing capability" },
          { id: 4, name: "Uniview 16 Channel NVR", price: 12500, category: "NVR", section_name: "NVR", image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=900&q=80", stock: 8, brand: "Uniview", description: "16 channel NVR with 4K recording and AI-powered analytics" },
          { id: 5, name: "Samsung 27-inch 4K Monitor", price: 18500, category: "Monitor", section_name: "Monitor", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80", stock: 12, brand: "Samsung", description: "27-inch 4K UHD monitor with HDR10 and USB-C connectivity" },
          { id: 6, name: "Dell Inspiron 15 Laptop", price: 52000, category: "Laptop", section_name: "Laptop", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80", stock: 6, brand: "Dell", description: "15.6-inch laptop with Intel i5, 8GB RAM, 512GB SSD" },
          { id: 7, name: "Western Digital 1TB HDD", price: 4200, category: "Hard Disk", section_name: "Hard Disk", image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80", stock: 25, brand: "Western Digital", description: "1TB internal hard disk drive with 7200 RPM and 64MB cache" },
          { id: 8, name: "TP-Link 5MP IP Camera", price: 3800, category: "IP Camera", section_name: "IP Camera", image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=900&q=80", stock: 18, brand: "TP-Link", description: "5MP IP camera with pan-tilt-zoom and two-way audio" },
          { id: 9, name: "Godrej 2MP Dome CCTV", price: 2900, category: "CCTV Camera", section_name: "CCTV Camera", image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=80", stock: 22, brand: "Godrej", description: "2MP dome camera with varifocal lens and smart IR technology" },
          { id: 10, name: "Seagate 2TB External HDD", price: 6500, category: "Hard Disk", section_name: "Hard Disk", image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80", stock: 14, brand: "Seagate", description: "2TB portable hard disk with USB 3.0 and shock resistance" },
        ];
        setProducts(demoProducts);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      // Fallback demo products on network error
      const demoProducts = [
        { id: 1, name: "4K Bullet CCTV Camera", price: 4500, category: "Cameras", section_name: "Cameras", image: "https://images.unsplash.com/photo-1620769673118-9c4cf6b1c9b5?auto=format&fit=crop&w=900&q=80", stock: 15, brand: "Hikvision", description: "Night vision, 4K clarity" },
        { id: 2, name: "IP Dome Camera", price: 5200, category: "Cameras", section_name: "Cameras", image: "https://images.unsplash.com/photo-1612107787826-6f8f2d2dcd02?auto=format&fit=crop&w=900&q=80", stock: 20, brand: "Uniview", description: "Weatherproof, remote monitoring" },
        { id: 3, name: "UltraSlim Business Laptop", price: 62000, category: "Laptops", section_name: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80", stock: 8, brand: "Dell", description: "16GB RAM, 512GB SSD, Intel i7" },
        { id: 4, name: "27-inch Gaming Monitor", price: 21500, category: "Monitors", section_name: "Monitors", image: "https://images.unsplash.com/photo-1593642532973-d31b6557fa68?auto=format&fit=crop&w=900&q=80", stock: 12, brand: "ASUS", description: "144Hz, 1ms response, IPS panel" },
        { id: 5, name: "1TB SSD Hard Disk", price: 7800, category: "Storage", section_name: "Storage", image: "https://images.unsplash.com/photo-1588614964601-ec2b7e4a382b?auto=format&fit=crop&w=900&q=80", stock: 30, brand: "Samsung", description: "High-speed SATA III SSD" },
        { id: 6, name: "Mechanical Keyboard & Mouse Combo", price: 6200, category: "Accessories", section_name: "Accessories", image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=900&q=80", stock: 25, brand: "Logitech", description: "RGB lighting, ergonomic design" },
      ];
      setProducts(demoProducts);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [
    selectedSection,
    searchQuery,
    priceRange,
    selectedBrands,
    productsPerPage,
  ]);

  useEffect(() => {
    fetchSections();
    fetchProducts();
  }, [fetchSections, fetchProducts]);

  const brands = useMemo(() => {
    const uniqueBrands = [
      ...new Set(products.map((p) => p.brand).filter(Boolean)),
    ];
    return uniqueBrands.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by price range
    if (priceRange.min) {
      filtered = filtered.filter((p) => p.price >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter((p) => p.price <= parseFloat(priceRange.max));
    }

    // Filter by selected brands
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) => selectedBrands.includes(p.brand));
    }

    // Sort products
    const sorted = [...filtered];
    switch (sortOrder) {
      case "priceLowHigh":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "priceHighLow":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "nameAZ":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "nameZA":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
        sorted.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
        );
        break;
      default:
        break;
    }

    return sorted;
  }, [products, sortOrder, priceRange, selectedBrands]);

  const handleBrandToggle = useCallback((brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedSection("All");
    setSearchQuery("");
    setSortOrder("default");
    setPriceRange({ min: "", max: "" });
    setSelectedBrands([]);
  }, []);

  const isInCart = useCallback(
    (productId) => cartItems.some((item) => item.id === productId),
    [cartItems],
  );

  const handleAddToCart = useCallback(
    (product) => {
      addToCart(product);
      addToast(`"${product.name}" added to cart!`, 'success');
    },
    [addToCart, addToast],
  );

  return (
    <div className="shop">
      {/* Quick Actions Bar */}
      <div className="quick-actions">
        <button
          className="action-btn"
          onClick={() => setShowQuickActions(!showQuickActions)}
        >
          ⚡ Quick Actions
        </button>
        {isAdmin() && (
          <button
            className="action-btn admin-btn"
            onClick={() => (window.location.href = "/admin")}
          >
            🛠 Admin Panel
          </button>
        )}
        <button
          className="action-btn"
          onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
        >
          {viewMode === "grid" ? "📋 List View" : "⊞ Grid View"}
        </button>
        <button
          className="action-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          🔍 Filters {showFilters ? "▼" : "▶"}
        </button>
      </div>

      {showQuickActions && (
        <div className="quick-actions-menu">
          <button onClick={clearFilters}>🗑 Clear All Filters</button>
          <button onClick={() => setSortOrder("newest")}>🆕 Show Newest</button>
          <button onClick={() => setSortOrder("priceLowHigh")}>
            💰 Cheapest First
          </button>
          <button onClick={() => setSelectedSection("Cameras")}>
            📷 Cameras
          </button>
          <button onClick={() => setSelectedSection("Laptops")}>
            💻 Laptops
          </button>
        </div>
      )}

      <div className="shop-header">
        <div>
          <h2>Shop Products</h2>
          <p className="shop-subtitle">
            Browse electronics, cameras, laptops, monitors and more. (
            {filteredProducts.length} products)
          </p>
        </div>

        <div className="shop-controls">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="default">Sort by</option>
            <option value="newest">Newest First</option>
            <option value="priceLowHigh">Price: Low to High</option>
            <option value="priceHighLow">Price: High to Low</option>
            <option value="nameAZ">Name: A → Z</option>
            <option value="nameZA">Name: Z → A</option>
          </select>
        </div>
      </div>

      <div className="sections">
        {sections.map((section) => (
          <button
            key={section.id || section.name}
            type="button"
            className={selectedSection === section.name ? "active" : ""}
            onClick={() => setSelectedSection(section.name)}
          >
            {section.name === "All"
              ? "🏠 All"
              : section.name === "IP Camera"
                ? "📷 IP Cameras"
                : section.name === "CCTV Camera"
                  ? "📹 CCTV Cameras"
                  : section.name === "DVR"
                    ? "🧭 DVR"
                    : section.name === "NVR"
                      ? "📡 NVR"
                      : section.name === "Monitor"
                        ? "🖥 Monitors"
                        : section.name === "Laptop"
                          ? "💻 Laptops"
                          : section.name === "Hard Disk"
                            ? "💾 Hard Disks"
                            : section.name}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="advanced-filters">
          <div className="filter-section">
            <h4>Price Range</h4>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min price"
                value={priceRange.min}
                onChange={(e) =>
                  setPriceRange((prev) => ({ ...prev, min: e.target.value }))
                }
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max price"
                value={priceRange.max}
                onChange={(e) =>
                  setPriceRange((prev) => ({ ...prev, max: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="filter-section">
            <h4>Brands</h4>
            <div className="brand-filters">
              {brands.map((brand) => (
                <label key={brand} className="brand-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => handleBrandToggle(brand)}
                  />
                  {brand}
                </label>
              ))}
            </div>
          </div>

          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear All Filters
          </button>
        </div>
      )}

      {loading && (
        <div className="product-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      )}

      {!loading && !error && (
        <div className={`product-grid ${viewMode}`}>
          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No products found</h3>
              <p>
                {searchQuery
                  ? "Try a different search term or clear the filters to see more products."
                  : "No products match your current filters. Try adjusting your criteria."}
              </p>
              <button className="btn" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div className={`product-card ${viewMode}`} key={product.id}>
                <div className="card-image-wrap">
                  <img
                    src={
                      product.image ||
                      getFallbackImage(product.category)
                    }
                    alt={product.name}
                    onError={(e) => {
                      e.target.src = getFallbackImage(product.category);
                    }}
                  />
                  {product.discount && (
                    <span className="discount-badge">{product.discount}% OFF</span>
                  )}
                </div>

                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <div className="product-rating">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="star">★</span>
                      ))}
                    </div>
                    <span className="rating-text">(4.{Math.floor(Math.random() * 9) + 1})</span>
                  </div>
                  <p className="product-description">
                    {product.description.length > 80
                      ? `${product.description.substring(0, 80)}...`
                      : product.description}
                  </p>
                  <div className="product-footer">
                    <div className="price-section">
                      <p className="price">
                        ₹{product.price.toLocaleString()}
                        {product.original_price && (
                          <del> ₹{product.original_price.toLocaleString()}</del>
                        )}
                      </p>
                    </div>
                    <p className="stock">Stock: {product.stock}</p>
                  </div>
                </div>

                <button
                  className="add-to-cart-btn"
                  onClick={() => handleAddToCart(product)}
                  disabled={
                    loading || isInCart(product.id) || product.stock === 0
                  }
                >
                  {product.stock === 0
                    ? "Out of Stock"
                    : isInCart(product.id)
                      ? "✓ In Cart"
                      : "Add to Cart"}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filteredProducts.length > productsPerPage && (
        <div className="pagination">
          <p>
            Showing {Math.min(productsPerPage, filteredProducts.length)} of{" "}
            {filteredProducts.length} products
          </p>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span>{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Shop;
