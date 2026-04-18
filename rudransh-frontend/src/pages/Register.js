import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import LoadingSpinner from "../components/LoadingSpinner";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

function Register() {
  const { register } = useContext(AuthContext);
  const { notify } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.phone && !/^[0-9+\-\s()]{10,}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (formData.address && formData.address.length < 5) {
      newErrors.address = "Address must be at least 5 characters";
    }

    if (formData.city && formData.city.length < 2) {
      newErrors.city = "Please enter a valid city";
    }

    if (!acceptTerms) {
      newErrors.terms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      notify("Please fix the highlighted fields before continuing.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
        address: formData.address || null,
      });

      setRegistrationSuccess(true);
      notify(
        "Account created successfully. Redirecting to login...",
        "success",
      );
      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        "Unable to register. Please try again.";
      setErrors({ submit: message });
      notify(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-form glass-card success-state">
          <div className="success-icon">✅</div>
          <h2>Account Created Successfully!</h2>
          <p>Your account has been registered. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-split-screen">
      <section className="auth-promo-panel glass-card">
        <div>
          <div className="brand-badge">Rudransh Enterprises</div>
          <h1>Secure your home with confidence</h1>
          <p>
            Register now for expert CCTV installation, dependable service, and
            easy order tracking.
          </p>

          <div className="promo-items">
            <div>
              <strong>✔ Fast professional installation</strong>
              <span>Same-day booking for local customers</span>
            </div>
            <div>
              <strong>✔ Trusted monitoring systems</strong>
              <span>Advanced CCTV, DVR, and access control</span>
            </div>
            <div>
              <strong>✔ Secure checkout experience</strong>
              <span>Encrypted login and order management</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel glass-card">
        <h2>Create Your Account</h2>
        <p className="form-subtitle">
          Start shopping and track deliveries from one secure dashboard.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-inner">
          <label className="input-group">
            <span className="input-icon">👤</span>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? "input-error" : ""}
              required
            />
          </label>
          {errors.name && <span className="error-text">{errors.name}</span>}

          <label className="input-group">
            <span className="input-icon">📧</span>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? "input-error" : ""}
              required
            />
          </label>
          {errors.email && <span className="error-text">{errors.email}</span>}

          <label className="input-group">
            <span className="input-icon">🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? "input-error" : ""}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </label>
          <PasswordStrengthMeter password={formData.password} />
          {errors.password && (
            <span className="error-text">{errors.password}</span>
          )}

          <label className="input-group">
            <span className="input-icon">🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={errors.confirmPassword ? "input-error" : ""}
              required
            />
          </label>
          {errors.confirmPassword && (
            <span className="error-text">{errors.confirmPassword}</span>
          )}

          <label className="input-group">
            <span className="input-icon">📞</span>
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleInputChange}
              className={errors.phone ? "input-error" : ""}
            />
          </label>
          {errors.phone && <span className="error-text">{errors.phone}</span>}

          <label className="input-group">
            <span className="input-icon">🏠</span>
            <input
              type="text"
              name="address"
              placeholder="Street Address"
              value={formData.address}
              onChange={handleInputChange}
              className={errors.address ? "input-error" : ""}
            />
          </label>
          {errors.address && (
            <span className="error-text">{errors.address}</span>
          )}

          <div className="form-row">
            <label className="input-group">
              <span className="input-icon">📍</span>
              <input
                type="text"
                name="city"
                placeholder="City"
                value={formData.city}
                onChange={handleInputChange}
                className={errors.city ? "input-error" : ""}
              />
            </label>
            <label className="input-group">
              <span className="input-icon">🏷️</span>
              <input
                type="text"
                name="state"
                placeholder="State"
                value={formData.state}
                onChange={handleInputChange}
              />
            </label>
            <label className="input-group">
              <span className="input-icon">📮</span>
              <input
                type="text"
                name="zipCode"
                placeholder="Zip Code"
                value={formData.zipCode}
                onChange={handleInputChange}
              />
            </label>
          </div>

          <label className="checkbox-group">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                if (e.target.checked && errors.terms) {
                  setErrors((prev) => ({
                    ...prev,
                    terms: "",
                  }));
                }
              }}
            />
            <span>
              I agree to the <Link to="/terms">Terms and Conditions</Link> and{" "}
              <Link to="/privacy">Privacy Policy</Link>
            </span>
          </label>
          {errors.terms && <span className="error-text">{errors.terms}</span>}

          {errors.submit && (
            <div className="form-error-box">
              <p>❌ {errors.submit}</p>
            </div>
          )}

          <button
            type="submit"
            className="btn primary-btn"
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner size={20} /> : "Create Account"}
          </button>

          <div className="auth-divider">Already registered?</div>
          <p className="auth-link">
            <Link to="/login" className="link-highlight">
              Sign in to your account
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default Register;
