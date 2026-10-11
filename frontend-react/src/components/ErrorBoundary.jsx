// src/components/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erreur capturee par ErrorBoundary:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Si la page ou l'enfant change, on reinitialise l'etat d'erreur
    if (prevProps.clePage !== this.props.clePage && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  reinitialiser = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  allerDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="mag-card react-fade-in"
          style={{
            maxWidth: "560px",
            margin: "2rem auto",
            padding: "2.5rem",
            textAlign: "center",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            borderRadius: "16px",
            border: "1px solid var(--line, #e2e8f0)",
          }}
        >
          <div style={{ fontSize: "2.8rem", marginBottom: "0.8rem" }}>⚠️</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--ink-900, #0f172a)", marginBottom: "0.5rem" }}>
            Un problème inattendu est survenu
          </h2>
          <p style={{ color: "var(--ink-600, #475569)", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "1.8rem" }}>
            Cette section a rencontré une erreur d'affichage. Vous pouvez recharger la page ou retourner au tableau de bord.
          </p>
          <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="mag-btn-primary"
              style={{ width: "auto", padding: "0.6rem 1.4rem" }}
              onClick={this.reinitialiser}
            >
              Recharger
            </button>
            <button
              type="button"
              className="mag-btn-lien"
              style={{ width: "auto", padding: "0.6rem 1.4rem" }}
              onClick={this.allerDashboard}
            >
              Tableau de bord →
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
