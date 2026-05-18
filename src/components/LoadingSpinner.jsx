import "./LoadingSpinner.css";

function LoadingSpinner() {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <p className="loading-label">LOADING</p>
    </div>
  );
}

export default LoadingSpinner;
