function PasswordStrengthMeter({ password }) {
  const strength = () => {
    if (!password) return { label: "Too short", score: 0 };
    const checks = [
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[a-z]/.test(password),
      /[^A-Za-z0-9]/.test(password),
      password.length >= 10,
    ];
    const score = checks.filter(Boolean).length;

    if (score <= 2) {
      return { label: "Weak", score, color: "#ff6b6b" };
    }
    if (score === 3) {
      return { label: "Moderate", score, color: "#ffb347" };
    }
    return { label: "Strong", score, color: "#2dcd8b" };
  };

  const { label, score, color } = strength();

  return (
    <div className="password-strength-meter">
      <div
        className="strength-bar"
        style={{ width: `${(score / 5) * 100}%`, background: color }}
      />
      <p className="strength-label" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

export default PasswordStrengthMeter;
