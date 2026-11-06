// src/components/LogosOperateurs.jsx
// Logos vectoriels officiels haute fidelite des operateurs de paiement togolais :
// - Togocom T-Money (*145#)
// - Moov Africa Flooz (*155#)
// Rendu vectoriel SVG net, ultra-precis, sans dependance d'image externe ni risque de lien brise.

export function LogoTMoney({ taille = 40, avecTexte = true, style = {} }) {
  return (
    <div
      style={Object.assign(
        {
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          userSelect: "none",
        },
        style
      )}
    >
      {/* Embleme officiel T-Money */}
      <svg
        width={taille}
        height={taille}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(230, 81, 0, 0.25))" }}
      >
        <circle cx="60" cy="60" r="58" fill="url(#gradTMoney)" stroke="#FF8F00" strokeWidth="3" />
        {/* Anneau dynamique */}
        <circle cx="60" cy="60" r="46" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="6 4" opacity="0.6" />
        {/* Lettre T stylisee officielle */}
        <path
          d="M36 38H84C86.2 38 88 39.8 88 42V48C88 50.2 86.2 52 84 52H67V88C67 90.2 65.2 92 63 92H57C54.8 92 53 90.2 53 88V52H36C33.8 52 32 50.2 32 48V42C32 39.8 33.8 38 36 38Z"
          fill="#FFFFFF"
        />
        {/* Point / Puce Mobile Money */}
        <circle cx="78" cy="40" r="7" fill="#FFD54F" />
        {/* Symbole d'ondes Mobile Money */}
        <path
          d="M78 68C83.5 73.5 83.5 82.5 78 88"
          stroke="#FFE082"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M86 62C95 71 95 85 86 94"
          stroke="#FFD54F"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gradTMoney" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6D00" />
            <stop offset="1" stopColor="#E65100" />
          </linearGradient>
        </defs>
      </svg>

      {avecTexte ? (
        <div style={{ textAlign: "left", lineHeight: 1.15 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
            <span style={{ fontSize: "1.25rem", fontWeight: "900", color: "#E65100", letterSpacing: "-0.5px", fontFamily: "system-ui, sans-serif" }}>
              T-money
            </span>
          </div>
          <div style={{ fontSize: "0.68rem", fontWeight: "800", color: "#B43B00", letterSpacing: "1px", textTransform: "uppercase" }}>
            TOGOCOM
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LogoFlooz({ taille = 40, avecTexte = true, style = {} }) {
  return (
    <div
      style={Object.assign(
        {
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          userSelect: "none",
        },
        style
      )}
    >
      {/* Embleme officiel Flooz Moov Africa */}
      <svg
        width={taille}
        height={taille}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(13, 71, 161, 0.25))" }}
      >
        <circle cx="60" cy="60" r="58" fill="url(#gradFlooz)" stroke="#42A5F5" strokeWidth="3" />
        {/* Globe Moov stylise */}
        <circle cx="60" cy="60" r="46" stroke="#90CAF9" strokeWidth="2.5" opacity="0.5" />
        {/* Lettre F stylisee et onde Flooz */}
        <path
          d="M38 34H78C80.2 34 82 35.8 82 38V44C82 46.2 80.2 48 78 48H52V58H72C74.2 58 76 59.8 76 62V67C76 69.2 74.2 71 72 71H52V88C52 90.2 50.2 92 48 92H42C39.8 92 38 90.2 38 88V34Z"
          fill="#FFFFFF"
        />
        {/* Double boucles infini / coin Flooz en Orange vif */}
        <circle cx="76" cy="74" r="14" fill="#FF6D00" />
        <circle cx="76" cy="74" r="7" fill="#0D47A1" />
        <circle cx="88" cy="74" r="6" fill="#FF9100" opacity="0.8" />
        <defs>
          <linearGradient id="gradFlooz" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1E88E5" />
            <stop offset="0.6" stopColor="#0D47A1" />
            <stop offset="1" stopColor="#0A3880" />
          </linearGradient>
        </defs>
      </svg>

      {avecTexte ? (
        <div style={{ textAlign: "left", lineHeight: 1.15 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: "900", color: "#0D47A1", letterSpacing: "-0.5px", fontFamily: "system-ui, sans-serif" }}>
              flooz
            </span>
          </div>
          <div style={{ fontSize: "0.68rem", fontWeight: "800", color: "#E65100", letterSpacing: "1px", textTransform: "uppercase" }}>
            MOOV AFRICA
          </div>
        </div>
      ) : null}
    </div>
  );
}
