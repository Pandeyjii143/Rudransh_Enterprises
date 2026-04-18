function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-box glass-card">
          <h3>Rudransh Enterprises</h3>
          <p>Modern electronics, security & installation in one place.</p>
          <p>Lalan Complex, near UCO Bank ATM</p>
          <p>Babunia More, Siwan, Bihar</p>
          <p>📞 +91 7739777191</p>
          <p>✉️ resecurity.siwan@gmail.com</p>
        </div>

        <div className="footer-box glass-card">
          <h3>Quick Links</h3>
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
          <a href="/installation">Installation</a>
          <a href="/admin">Dashboard</a>
        </div>

        <div className="footer-box glass-card">
          <h3>Follow Us</h3>
          <div className="social-links">
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a>
            <a href="https://www.instagram.com/mohan__1226?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Rudransh Enterprises • Premium Security Solutions</p>
      </div>
    </footer>
  );
}

export default Footer;
