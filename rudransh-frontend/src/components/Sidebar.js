import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useContext(AuthContext);
  const { theme, currentTheme, changeTheme, themes } = useTheme();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || "");

  const handleLogout = () => {
    logout();
    navigate("/");
    onClose();
  };

  const handleAddressChange = (e) => {
    setDeliveryAddress(e.target.value);
  };

  const saveAddress = () => {
    // API call to save address
    alert("Address saved!");
    setShowSettings(false);
  };

  const openSettings = () => {
    setShowSettings(true);
    onClose(); // Close the sidebar when opening settings
  };

  if (!isOpen && !showSettings) return null;

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose}>
          <div className="sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-header">
              <h3>Menu</h3>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <nav className="sidebar-nav">
              <Link to="/" className="sidebar-link" onClick={onClose}>
                Home
              </Link>
              <Link to="/shop" className="sidebar-link" onClick={onClose}>
                Shop
              </Link>
              <Link to="/installation" className="sidebar-link" onClick={onClose}>
                Installation
              </Link>
              <Link to="/about" className="sidebar-link" onClick={onClose}>
                About Us
              </Link>

              <button className="sidebar-link" onClick={openSettings}>
                ⚙️ Settings
              </button>

              {user && (
                <Link to="/orders" className="sidebar-link" onClick={onClose}>
                  My Orders
                </Link>
              )}

              {user?.role === "admin" && (
                <Link to="/admin" className="sidebar-link" onClick={onClose}>
                  Admin Dashboard
                </Link>
              )}

              {user ? (
                <>
                  <div className="sidebar-user">
                    <span>Hi, {user.name || "User"}</span>
                  </div>
                  <button onClick={handleLogout} className="sidebar-logout">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="sidebar-link" onClick={onClose}>
                    Login
                  </Link>
                  <Link to="/register" className="sidebar-link" onClick={onClose}>
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: theme.surface, color: theme.text }}>
            <div className="settings-header" style={{ borderBottom: `1px solid ${theme.secondary}` }}>
              <h3 style={{ color: theme.text }}>Settings</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>

            <div className="settings-content">
              {/* Theme Settings */}
              <div className="settings-section">
                <h4 style={{ color: theme.text }}>Theme</h4>
                <div className="theme-options">
                  {Object.keys(themes).map((themeKey) => (
                    <button
                      key={themeKey}
                      className={`theme-btn ${currentTheme === themeKey ? 'active' : ''}`}
                      onClick={() => changeTheme(themeKey)}
                      style={{
                        borderColor: currentTheme === themeKey ? themes[themeKey].primary : '#ddd',
                        backgroundColor: currentTheme === themeKey ? themes[themeKey].primary : theme.surface,
                        color: currentTheme === themeKey ? 'white' : theme.text
                      }}
                    >
                      {themes[themeKey].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Settings */}
              {user && (
                <div className="settings-section">
                  <h4 style={{ color: theme.text }}>Delivery Address</h4>
                  <textarea
                    value={deliveryAddress}
                    onChange={handleAddressChange}
                    placeholder="Enter your delivery address"
                    className="address-input"
                    style={{
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: theme.secondary
                    }}
                  />
                  <button className="save-btn" onClick={saveAddress} style={{ backgroundColor: theme.primary }}>
                    Save Address
                  </button>
                </div>
              )}

              {/* Account Info */}
              {user && (
                <div className="settings-section">
                  <h4 style={{ color: theme.text }}>Account Information</h4>
                  <div className="account-info">
                    <p style={{ color: theme.text }}><strong>Name:</strong> {user.name}</p>
                    <p style={{ color: theme.text }}><strong>Email:</strong> {user.email}</p>
                    <p style={{ color: theme.text }}><strong>Phone:</strong> {user.phone || "Not provided"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;