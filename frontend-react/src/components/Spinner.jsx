// src/components/Spinner.jsx
import { traduireTexte } from "../localisation.js";
export default function Spinner({ texte }) {
  return (
    <div className="react-spinner-bloc">
      <span className="react-spinner"></span>
      {texte ? <span className="react-spinner-texte">{traduireTexte(texte)}</span> : null}
    </div>
  );
}
