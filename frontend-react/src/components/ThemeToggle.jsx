// src/components/ThemeToggle.jsx
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ theme, onBasculerTheme, langue }) {
  const estSombre = theme === "dark";
  const infobulle = estSombre
    ? (langue === "en" ? "Switch to light mode" : "Passer en mode clair")
    : (langue === "en" ? "Switch to dark mode" : "Passer en mode sombre");

  return (
    <button
      type="button"
      onClick={onBasculerTheme}
      className="react-theme-toggle"
      title={infobulle}
      aria-label={infobulle}
    >
      {estSombre ? (
        <Sun className="react-theme-toggle-icone react-theme-toggle-soleil" size={17} />
      ) : (
        <Moon className="react-theme-toggle-icone react-theme-toggle-lune" size={17} />
      )}
    </button>
  );
}
