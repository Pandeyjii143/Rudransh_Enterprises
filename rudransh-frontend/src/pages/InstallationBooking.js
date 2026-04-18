import { useState } from "react";

function InstallationBooking() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    cameras: "",
    type: "",
    date: "",
    description: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const message = `
🔒 *Rudransh Enterprises - CCTV Installation Request*

👤 *Customer Details*
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}

📍 *Installation Details*
Location: ${formData.location}
Number of Cameras: ${formData.cameras}
Installation Type: ${formData.type}
Preferred Date: ${formData.date}

📝 *Additional Notes*
${formData.description || "No additional notes"}

---
Ready to secure your space! ✅
`;

    const whatsappURL =
      "https://wa.me/917739777191?text=" + encodeURIComponent(message);

    window.open(whatsappURL, "_blank");
    setSubmitted(true);
    setTimeout(() => {
      setFormData({
        name: "",
        email: "",
        phone: "",
        location: "",
        cameras: "",
        type: "",
        date: "",
        description: "",
      });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="installation-page">
      <section className="installation-hero">
        <div className="hero-overlay" />
        <div className="hero-content glass-card">
          <h1>Professional CCTV Installation</h1>
          <p>Expert setup by certified technicians • Free consultation • Fast deployment</p>
        </div>
      </section>

      <section className="installation-benefits">
        <div className="benefits-container">
          <div className="benefit-card glass-card">
            <div className="benefit-icon">🚀</div>
            <h3>Fast Deployment</h3>
            <p>Setup complete within 24-48 hours of booking</p>
          </div>
          <div className="benefit-card glass-card">
            <div className="benefit-icon">👨‍🔧</div>
            <h3>Expert Technicians</h3>
            <p>Certified professionals with 10+ years experience</p>
          </div>
          <div className="benefit-card glass-card">
            <div className="benefit-icon">🔧</div>
            <h3>Full Support</h3>
            <p>Complete setup, testing, and 24/7 support included</p>
          </div>
          <div className="benefit-card glass-card">
            <div className="benefit-icon">💰</div>
            <h3>Transparent Pricing</h3>
            <p>No hidden charges • Free consultation • Price match guarantee</p>
          </div>
        </div>
      </section>

      <section className="installation-form-section">
        <div className="form-wrapper">
          <h2>Book Your Installation</h2>

          {submitted && (
            <div className="success-message glass-card">
              ✅ Request sent! Our team will contact you within 2 hours.
            </div>
          )}

          <form onSubmit={handleSubmit} className="installation-form glass-card">
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Installation Location *</label>
                <input
                  type="text"
                  name="location"
                  placeholder="e.g., Main Street, Downtown"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Number of Cameras *</label>
                <input
                  type="number"
                  name="cameras"
                  placeholder="4"
                  min="1"
                  max="100"
                  value={formData.cameras}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Installation Type *</label>
                <select name="type" value={formData.type} onChange={handleChange} required>
                  <option value="">Select Type</option>
                  <option value="Residential">Residential (Home)</option>
                  <option value="Commercial">Commercial (Shop/Store)</option>
                  <option value="Office">Office/Corporate</option>
                  <option value="Industrial">Industrial/Factory</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label>Preferred Installation Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Additional Requirements (Optional)</label>
              <textarea
                name="description"
                placeholder="e.g., Need NVR setup, night vision required, cable routing preference..."
                value={formData.description}
                onChange={handleChange}
                rows="4"
              />
            </div>

            <button type="submit" className="btn hero-btn">
              📱 Send Request via WhatsApp
            </button>
          </form>
        </div>
      </section>

      <section className="installation-faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item glass-card">
            <h3>How long does installation take?</h3>
            <p>Most installations take 4-8 hours depending on complexity. We'll give you an estimate during consultation.</p>
          </div>
          <div className="faq-item glass-card">
            <h3>Do you provide warranty?</h3>
            <p>Yes! All installations come with 2-year equipment warranty and 1-year service warranty.</p>
          </div>
          <div className="faq-item glass-card">
            <h3>Can you install custom setups?</h3>
            <p>Absolutely! We handle everything from basic 2-camera setups to complex enterprise systems.</p>
          </div>
          <div className="faq-item glass-card">
            <h3>What about maintenance?</h3>
            <p>We offer quarterly maintenance packages and 24/7 emergency support for all our installations.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default InstallationBooking;
