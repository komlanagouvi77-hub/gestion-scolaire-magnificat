export default function SelecteurLangue({ langue, onChangerLangue }) {
  const anglais = langue === "en";
  return (
    <label className="react-header-langue-zone">
      <span className="react-header-langue-label">{anglais ? "Language" : "Langue"}</span>
      <select className="react-header-langue" value={langue} onChange={onChangerLangue} aria-label={anglais ? "Select language" : "Choisir la langue"}>
        <option value="fr">Français</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
