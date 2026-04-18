import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";

const featuredProducts = [
  {
    id: 1,
    name: "4K Bullet CCTV Camera",
    category: "Cameras",
    description: "Night vision, motion detection and 4K clarity.",
    price: 4500,
    image: "https://images.unsplash.com/photo-1620769673118-9c4cf6b1c9b5?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 2,
    name: "IP Dome Camera",
    category: "Cameras",
    description: "Weatherproof, remote monitoring with wide-angle lens.",
    price: 5200,
    image: "https://images.unsplash.com/photo-1612107787826-6f8f2d2dcd02?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 3,
    name: "UltraSlim Business Laptop",
    category: "Laptops",
    description: "16GB RAM, 512GB SSD, Intel i7 for fast performance.",
    price: 62000,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 4,
    name: "27-inch Gaming Monitor",
    category: "Monitors",
    description: "144Hz, 1ms response, IPS panel for crisp visuals.",
    price: 21500,
    image: "https://images.unsplash.com/photo-1593642532973-d31b6557fa68?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 5,
    name: "1TB SSD Hard Disk",
    category: "Storage",
    description: "High-speed SATA III SSD for reliability.",
    price: 7800,
    image: "https://images.unsplash.com/photo-1588614964601-ec2b7e4a382b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 6,
    name: "Mechanical Keyboard & Mouse Combo",
    category: "Accessories",
    description: "RGB lighting, ergonomic design, durable switches.",
    price: 6200,
    image: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=900&q=80",
  },
];

const trustStats = [
  { title: "500+ Cameras Installed", value: "500+", icon: "📷" },
  { title: "100+ Happy Clients", value: "100+", icon: "😊" },
  { title: "24/7 Support", value: "24/7", icon: "🛠" },
  { title: "Trusted Security", value: "100%", icon: "🔒" },
];

function Home() {
  const { user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);

  return (
    <main className="home-page">
      <section className="hero hero-techvision">
        <div className="hero-overlay" />

        <div className="hero-content glass-card">
          <h1>Rudransh Enterprises</h1>
          <p className="subtitle">Your Security, Our Priority</p>
          {user && <p className="welcome">Welcome back, {user.name}!</p>}

          <div className="hero-buttons">
            <Link to="/shop">
              <button className="btn hero-btn">Shop Now</button>
            </Link>
            <Link to="/installation">
              <button className="btn hero-btn outline">Book Installation</button>
            </Link>
          </div>
        </div>
      </section>

      <section className="section products-section">
        <div className="section-header">
          <h2>Featured Electronics</h2>
          <p>High-quality products from trusted brands.</p>
        </div>

        <div className="products-grid">
          {featuredProducts.map((product) => (
            <article key={product.id} className="glass-card product-card">
              <div className="card-image-wrap">
                <img
                  src={product.image}
                  alt={product.name}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1603791452906-186b86c1d42f?auto=format&fit=crop&w=900&q=80";
                  }}
                />
              </div>
              <h3>{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <p className="price">₹{product.price}</p>
              <button className="btn add-to-cart-btn" onClick={() => addToCart(product)}>
                Add to Cart
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="section trust-section">
        <h2>Trusted Security Solutions</h2>
        <p className="section-tagline">Built for reliability and professional peace of mind</p>

        <div className="trust-grid">
          {trustStats.map((item) => (
            <article key={item.title} className="glass-card trust-card">
              <div className="trust-icon">{item.icon}</div>
              <h3>{item.value}</h3>
              <p>{item.title}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="footer-cta glass-card">
        <h2>Ready for your next security upgrade?</h2>
        <div className="hero-buttons">
          <Link to="/shop">
            <button className="btn hero-btn">Explore Catalog</button>
          </Link>
          <Link to="/installation">
            <button className="btn hero-btn outline">Book a Technician</button>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;
