import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import LoadingSpinner from "../components/LoadingSpinner";

function Login() {
  const { login, googleLogin } = useContext(AuthContext);
  const { notify } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email"); // "email" or "phone"
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Mock OTP send
      alert(`OTP sent to ${phone}: 123456`);
      setOtpSent(true);
    } catch (err) {
      setError("Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = () => {
    setLoginMethod("email");
    setEmail("resecurity.siwan@gmail.com");
    setPassword("Surya@87098");
    setError(null);
    notify("Admin credentials filled. Press Login to continue.", "info");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (loginMethod === "phone") {
        if (otp !== "123456") {
          throw new Error("Invalid OTP");
        }
        // Mock phone login
        alert("Phone login successful (mock)");
        navigate("/");
      } else {
        console.log("Attempting login with email:", email);
        await login({ email, password });
        console.log("Login successful, navigating to home");
        notify("Logged in successfully", "success");
        navigate("/");
      }
    } catch (err) {
      console.log("Login failed with error:", err);
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Unable to login. Please try again.";
      setError(message);
      notify(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page auth-split-screen">
      <section className="auth-promo-panel">
        <div>
          <div className="brand-badge">Rudransh Enterprises</div>
          <h1>Secure Your Home & Business</h1>
          <p>
            Premium CCTV, DVR, alarm systems and professional installation with
            trusted support.
          </p>

          <div className="promo-items">
            <div>
              <strong>✔️ 500+ installations</strong>
              <span>Residential & commercial security</span>
            </div>
            <div>
              <strong>✔️ 100+ happy clients</strong>
              <span>Trusted monitoring and installation</span>
            </div>
            <div>
              <strong>✔️ 24/7 support</strong>
              <span>Fast response and repairs</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel glass-card">
        <h2>Welcome Back</h2>
        <p>Login to manage orders, track deliveries and shop securely.</p>

        <form onSubmit={handleSubmit} className="auth-form-inner">
          <div className="login-toggle">
            <button
              type="button"
              className={loginMethod === "email" ? "active" : ""}
              onClick={() => setLoginMethod("email")}
            >
              Email Login
            </button>
            <button
              type="button"
              className={loginMethod === "phone" ? "active" : ""}
              onClick={() => setLoginMethod("phone")}
            >
              Phone Login
            </button>
          </div>

          {loginMethod === "email" ? (
            <>
              <label className="input-group">
                <span className="input-icon">📧</span>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="input-group">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              <div className="forgot-password">
                <button
                  type="button"
                  className="forgot-btn"
                  onClick={() => alert("Forgot password feature coming soon!")}
                >
                  Forgot Password?
                </button>
              </div>
              <button
                type="button"
                className="btn secondary-btn admin-login-btn"
                onClick={handleAdminLogin}
              >
                Admin Login
              </button>
            </>
          ) : (
            <>
              <label className="input-group">
                <span className="input-icon">📱</span>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>

              {!otpSent ? (
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                >
                  Send OTP
                </button>
              ) : (
                <label className="input-group">
                  <span className="input-icon">🔢</span>
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </label>
              )}
            </>
          )}

          {error && <div className="form-error-box">{error}</div>}

          <button
            type="submit"
            className="btn primary-btn"
            disabled={isLoading || (loginMethod === "phone" && !otpSent)}
          >
            {isLoading ? <LoadingSpinner size={20} /> : "Login"}
          </button>

          <div className="auth-divider">or continue with</div>

          <button
            type="button"
            className="btn secondary-btn google-btn"
            onClick={googleLogin}
          >
            Continue with Google
          </button>
        </form>

        <p className="auth-link">
          New to Rudransh? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}

export default Login;
