function LoadingSpinner({ size = 46 }) {
  return (
    <div className="loading-spinner" style={{ width: size, height: size }}>
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export default LoadingSpinner;
