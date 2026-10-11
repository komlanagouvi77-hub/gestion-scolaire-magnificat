// src/components/BoutonSupprimer.jsx
export default function BoutonSupprimer({ onClick, texte, disabled }) {
  return (
    <button type="button" className="mag-btn-supprimer" onClick={onClick} disabled={disabled}>
      {texte || "Supprimer"}
    </button>
  );
}
