import { useContext } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../context/CartContext";
import logo from "../assests/images/logo.png";

function Navbar({ onToggleSidebar }) {
  const { cartItems } = useContext(CartContext);

  return (
    <nav className="navbar">
      <button className="hamburger-btn" onClick={onToggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div className="logo">
        <Link to="/">
          <img
            src={logo}
            alt="Rudransh Enterprises logo"
            className="app-logo"
          />
          <span>Rudransh Enterprises</span>
        </Link>
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/cart">Cart ({cartItems.length})</Link>
        <Link to="/installation">Installation</Link>
        <Link to="/login">Login</Link>
      </div>
    </nav>
  );
}

export default Navbar;
