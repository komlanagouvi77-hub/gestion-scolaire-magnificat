// src/components/ModalPaiementMobileMoney.jsx
// Modal interactif de paiement Mobile Money pour le Togo :
// - Togocom T-Money (*145#)
// - Moov Africa Flooz (*155#)
// Concu pour une presentation ultra professionnelle lors de la soutenance ESGIS.
import { useState, useEffect } from "react";
import { initierMobileMoney, validerMobileMoney, telechargerRecuPaiementPdf } from "../api.js";
import { traduireTexte, localeActive } from "../localisation.js";
import { Alerte } from "./Widgets.jsx";

const OPERATEURS = [
  {
    id: "tmoney",
    nom: "T-Money",
    reseau: "Togocom (*145#)",
    couleur: "#E65100",
    bg: "#FFF3E0",
    bordure: "#FFB74D",
    prefixe: "90, 91, 92, 93, 70",
    defautTel: "90 12 34 56",
  },
  {
    id: "flooz",
    nom: "Flooz",
    reseau: "Moov Africa (*155#)",
    couleur: "#0D47A1",
    bg: "#E3F2FD",
    bordure: "#64B5F6",
    prefixe: "96, 97, 98, 99",
    defautTel: "96 98 76 54",
  },
];

export default function ModalPaiementMobileMoney({
  token,
  eleves = [],
  eleveInitialId = "",
  onFermer,
  onSucces,
}) {
  const [eleveId, setEleveId] = useState(eleveInitialId || (eleves[0] ? String(eleves[0].id) : ""));
  const [tranche, setTranche] = useState("1");
  const [montant, setMontant] = useState("25000");
  const [operateur, setOperateur] = useState("tmoney");
  const [telephone, setTelephone] = useState("90 12 34 56");
  const [codePin, setCodePin] = useState("1234");
  
  // etapes : "formulaire", "attente_ussd", "traitement", "succes"
  const [etape, setEtape] = useState("formulaire");
  const [chargement, setChargement] = useState(false);
  const [messageTraitement, setMessageTraitement] = useState("");
  const [erreur, setErreur] = useState(null);
  const [infoTransaction, setInfoTransaction] = useState(null);
  const [paiementValide, setPaiementValide] = useState(null);
  const [enCoursPdf, setEnCoursPdf] = useState(false);

  const changerOperateur = function (opId) {
    setOperateur(opId);
    if (!telephone || telephone === "90 12 34 56" || telephone === "96 98 76 54") {
      setTelephone(opId === "tmoney" ? "90 12 34 56" : "96 98 76 54");
    }
  };

  useEffect(function () {
    const gererEchap = function (e) {
      if (e.key === "Escape" && etape !== "traitement") onFermer();
    };
    document.addEventListener("keydown", gererEchap);
    document.body.style.overflow = "hidden";
    return function () {
      document.removeEventListener("keydown", gererEchap);
      document.body.style.overflow = "";
    };
  }, [onFermer, etape]);

  const soumettreInitiation = async function (e) {
    e.preventDefault();
    setErreur(null);
    if (!eleveId) {
      setErreur("Veuillez selectionner un eleve.");
      return;
    }
    const cleanTel = telephone.replace(/\D/g, "");
    if (cleanTel.length < 8) {
      setErreur("Veuillez renseigner un numero togolais valide (8 chiffres).");
      return;
    }

    setChargement(true);
    try {
      const res = await initierMobileMoney(token, {
        eleve_id: Number(eleveId),
        tranche: Number(tranche),
        montant: montant,
        operateur: operateur,
        telephone: cleanTel,
      });
      setInfoTransaction(res);
      setEtape("attente_ussd");
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'initiation du paiement.");
    } finally {
      setChargement(false);
    }
  };

  const confirmerValidationUSSD = async function () {
    if (!infoTransaction) return;
    setEtape("traitement");
    setErreur(null);

    setMessageTraitement("1/3 — Verification du code PIN aupres de l'operateur...");
    await new Promise(function (r) { setTimeout(r, 700); });

    setMessageTraitement("2/3 — Rapprochement de caisse bancaire (FedaPay)...");
    await new Promise(function (r) { setTimeout(r, 700); });

    setMessageTraitement("3/3 — Generation de la quittance et du recu certifie...");

    try {
      const res = await validerMobileMoney(token, {
        reference: infoTransaction.reference,
        code_pin: codePin || "1234",
      });
      setPaiementValide(res);
      setEtape("succes");
      if (onSucces) onSucces(res);
    } catch (err) {
      setErreur(err.message || "Echec de validation de la transaction.");
      setEtape("attente_ussd");
    }
  };

  const telechargerRecu = async function () {
    if (!paiementValide || !paiementValide.paiement_id) return;
    setEnCoursPdf(true);
    try {
      const nomFichier = "recu_officiel_" + (paiementValide.eleve_nom || "eleve").replace(/\s+/g, "_") + ".pdf";
      await telechargerRecuPaiementPdf(paiementValide.paiement_id, token, nomFichier);
    } catch (err) {
      alert("Erreur lors du telechargement du recu : " + (err.message || ""));
    } finally {
      setEnCoursPdf(false);
    }
  };

  const eleveSelectionne = eleves.find(function (el) { return String(el.id) === String(eleveId); });
  const nomEleve = eleveSelectionne ? (eleveSelectionne.prenom + " " + eleveSelectionne.nom) : "Eleve";

  return (
    <div className="react-modal-fond" onClick={onFermer} role="dialog" aria-modal="true">
      <div
        className="react-modal-boite"
        style={{ maxWidth: "580px", width: "95%", borderRadius: "14px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}
        onClick={function (e) { e.stopPropagation(); }}
      >
        {/* Bandeau d'en-tete */}
        <div style={{ background: "linear-gradient(135deg, #16324F 0%, #1e4a73 100%)", padding: "1.2rem 1.6rem", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <span style={{ fontSize: "2rem" }}>📲</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>Paiement Mobile Money</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", opacity: 0.9 }}>Passerelle securisee — Complexe Scolaire Magnificat</p>
              </div>
            </div>
            {etape !== "traitement" ? (
              <button
                type="button"
                onClick={onFermer}
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "1.6rem", cursor: "pointer", opacity: 0.8 }}
                aria-label="Fermer"
              >
                &times;
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {erreur ? <Alerte type="erreur">{erreur}</Alerte> : null}

          {/* ETAPE 1 : FORMULAIRE DE SAISIE */}
          {etape === "formulaire" ? (
            <form onSubmit={soumettreInitiation}>
              <div style={{ marginBottom: "1.2rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  1. Choisissez l'operateur de paiement
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                  {OPERATEURS.map(function (op) {
                    const estActif = operateur === op.id;
                    return (
                      <div
                        key={op.id}
                        onClick={function () { changerOperateur(op.id); }}
                        style={{
                          border: "2px solid " + (estActif ? op.couleur : "var(--line, #e2e8f0)"),
                          background: estActif ? op.bg : "var(--bg-card, #fff)",
                          borderRadius: "10px",
                          padding: "0.9rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          textAlign: "center",
                          position: "relative",
                        }}
                      >
                        {estActif ? (
                          <span style={{ position: "absolute", top: "6px", right: "8px", fontSize: "0.8rem", color: op.couleur, fontWeight: 700 }}>✓</span>
                        ) : null}
                        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: op.couleur }}>{op.nom}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--ink-700, #334155)", marginTop: "0.2rem", fontWeight: 500 }}>{op.reseau}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--ink-500, #94a3b8)", marginTop: "0.2rem" }}>Prefixes : {op.prefixe}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Choix Eleve */}
              {eleves.length > 1 ? (
                <div className="mag-field" style={{ marginBottom: "1rem" }}>
                  <label htmlFor="mm-eleve">2. Eleve concerne</label>
                  <select
                    id="mm-eleve"
                    value={eleveId}
                    onChange={function (e) { setEleveId(e.target.value); }}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}
                    required
                  >
                    {eleves.map(function (el) {
                      return <option key={el.id} value={el.id}>{el.nom} {el.prenom} ({el.matricule}) - {el.classe_nom || "Classe"}</option>;
                    })}
                  </select>
                </div>
              ) : null}

              {/* Tranche & Montant */}
              <div className="mag-grid-2" style={{ marginBottom: "1rem" }}>
                <div className="mag-field">
                  <label htmlFor="mm-tranche">Tranche de scolarite</label>
                  <select
                    id="mm-tranche"
                    value={tranche}
                    onChange={function (e) { setTranche(e.target.value); }}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}
                  >
                    <option value="1">1ere tranche</option>
                    <option value="2">2eme tranche</option>
                    <option value="3">3eme tranche</option>
                  </select>
                </div>
                <div className="mag-field">
                  <label htmlFor="mm-montant">Montant a verser (FCFA)</label>
                  <input
                    id="mm-montant"
                    type="number"
                    min="100"
                    step="500"
                    value={montant}
                    onChange={function (e) { setMontant(e.target.value); }}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px", fontWeight: 700, fontSize: "1rem" }}
                    required
                  />
                </div>
              </div>

              {/* Numero de telephone */}
              <div className="mag-field" style={{ marginBottom: "1.4rem" }}>
                <label htmlFor="mm-tel">Numero de debit {operateur === "tmoney" ? "T-Money (Togocom)" : "Flooz (Moov Africa)"}</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ padding: "0.6rem 0.8rem", background: "#f1f5f9", border: "1px solid var(--line)", borderRight: "none", borderRadius: "6px 0 0 6px", fontWeight: 700, fontSize: "0.9rem", color: "#334155" }}>
                    +228
                  </span>
                  <input
                    id="mm-tel"
                    type="tel"
                    placeholder="Ex: 90 12 34 56"
                    value={telephone}
                    onChange={function (e) { setTelephone(e.target.value); }}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "0 6px 6px 0", fontWeight: 600 }}
                    required
                  />
                </div>
                <small style={{ color: "var(--ink-500)", fontSize: "0.75rem", display: "block", marginTop: "0.3rem" }}>
                  Le compte sera debite via notification push USSD automatique.
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
                <button type="button" onClick={onFermer} className="mag-btn-secondary" disabled={chargement}>
                  Annuler
                </button>
                <button
                  type="submit"
                  className="mag-btn-primary"
                  style={{
                    background: operateur === "tmoney" ? "#E65100" : "#0D47A1",
                    borderColor: operateur === "tmoney" ? "#E65100" : "#0D47A1",
                    padding: "0.65rem 1.8rem",
                    fontSize: "0.95rem",
                  }}
                  disabled={chargement}
                >
                  {chargement ? <span className="react-spinner"></span> : "Lancer le paiement (" + Number(montant).toLocaleString(localeActive()) + " FCFA) →"}
                </button>
              </div>
            </form>
          ) : null}

          {/* ETAPE 2 : ATTENTE VALIDATION USSD PUSH (SMARTPHONE MOCKUP) */}
          {etape === "attente_ussd" && infoTransaction ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <span className="mag-badge" style={{ background: "#FEF3C7", color: "#92400E", fontWeight: 700, padding: "0.3rem 0.8rem", fontSize: "0.82rem" }}>
                  ⏳ Notification USSD transmise au reseau
                </span>
              </div>

              {/* Phone Mockup Screen */}
              <div
                style={{
                  background: "#0F172A",
                  borderRadius: "14px",
                  padding: "1.4rem",
                  color: "#fff",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                  maxWidth: "420px",
                  margin: "0 auto 1.2rem auto",
                  border: "2px solid #334155",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1E293B", paddingBottom: "0.6rem", marginBottom: "0.9rem", fontSize: "0.78rem", color: "#94A3B8" }}>
                  <span>{operateur === "tmoney" ? "TOGOCOM T-MONEY" : "MOOV FLOOZ"}</span>
                  <span>+228 {telephone}</span>
                </div>

                <div style={{ fontSize: "0.88rem", lineHeight: "1.45", color: "#E2E8F0", marginBottom: "1rem" }}>
                  <div style={{ fontWeight: 700, color: operateur === "tmoney" ? "#FDBA74" : "#93C5FD", marginBottom: "0.3rem" }}>
                    🔔 Demande de paiement
                  </div>
                  <div>Marchand : <strong>Complexe Scolaire Magnificat</strong></div>
                  <div>Eleve : {nomEleve} (Tranche {tranche})</div>
                  <div>Montant : <strong style={{ fontSize: "1.1rem", color: "#4ADE80" }}>{Number(montant).toLocaleString(localeActive())} FCFA</strong></div>
                  <div>Ref : <code style={{ color: "#CBD5E1" }}>{infoTransaction.reference}</code></div>
                </div>

                <div style={{ background: "#1E293B", borderRadius: "8px", padding: "0.8rem", marginBottom: "1rem" }}>
                  <label htmlFor="ussd-pin" style={{ display: "block", fontSize: "0.78rem", color: "#94A3B8", marginBottom: "0.3rem" }}>
                    Entrez votre code secret Mobile Money pour autoriser :
                  </label>
                  <input
                    id="ussd-pin"
                    type="password"
                    maxLength="6"
                    value={codePin}
                    onChange={function (e) { setCodePin(e.target.value); }}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      background: "#0F172A",
                      border: "1px solid #475569",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "1.2rem",
                      letterSpacing: "4px",
                      textAlign: "center",
                    }}
                    placeholder="••••"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.6rem" }}>
                  <button
                    type="button"
                    onClick={function () { setEtape("formulaire"); }}
                    style={{ background: "#334155", border: "none", color: "#fff", padding: "0.6rem", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmerValidationUSSD}
                    style={{
                      background: operateur === "tmoney" ? "#EA580C" : "#1D4ED8",
                      border: "none",
                      color: "#fff",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Autoriser le debit ✓
                  </button>
                </div>
              </div>

              <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--ink-500)" }}>
                Simulation certifiee pour soutenance ESGIS (interconnexion FedaPay / Sandbox active).
              </div>
            </div>
          ) : null}

          {/* ETAPE TRAITEMENT EN DIRECT */}
          {etape === "traitement" ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
              <div style={{ display: "inline-block", marginBottom: "1.2rem" }}>
                <span className="react-spinner" style={{ width: "42px", height: "42px", borderWidth: "3px" }}></span>
              </div>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.15rem", fontWeight: 700 }}>
                Transaction en cours d'approbation...
              </h4>
              <p style={{ color: "#E65100", fontWeight: 600, fontSize: "0.9rem" }}>
                {messageTraitement}
              </p>
            </div>
          ) : null}

          {/* ETAPE 3 : SUCCES ET RECU OFFICIEL */}
          {etape === "succes" && paiementValide ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "76px",
                  height: "76px",
                  borderRadius: "50%",
                  background: "#DCFCE7",
                  color: "#16A34A",
                  fontSize: "2.5rem",
                  marginBottom: "1rem",
                  boxShadow: "0 0 0 8px rgba(34, 197, 94, 0.15)",
                }}
              >
                ✓
              </div>
              <h4 style={{ margin: "0 0 0.4rem 0", fontSize: "1.3rem", color: "#166534", fontWeight: 800 }}>
                Paiement valide avec succes !
              </h4>
              <p style={{ color: "var(--ink-700)", fontSize: "0.88rem", margin: "0 0 1.2rem 0" }}>
                Les fonds ont ete credites dans la caisse de l'etablissement et le solde de l'eleve est a jour.
              </p>

              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #86EFAC",
                  borderRadius: "10px",
                  padding: "1rem 1.2rem",
                  margin: "0 auto 1.4rem auto",
                  maxWidth: "420px",
                  fontSize: "0.88rem",
                  textAlign: "left",
                  lineHeight: "1.6",
                }}
              >
                <div><strong>Eleve :</strong> {paiementValide.eleve_nom}</div>
                <div><strong>Montant regle :</strong> <span style={{ color: "#15803D", fontWeight: 700 }}>{Number(paiementValide.montant).toLocaleString(localeActive())} FCFA</span></div>
                <div><strong>Tranche :</strong> {paiementValide.tranche}e tranche de scolarite</div>
                <div><strong>Reference transaction :</strong> <code style={{ background: "#DCFCE7", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>{paiementValide.reference}</code></div>
                <div><strong>Mode :</strong> Mobile Money ({operateur === "tmoney" ? "Togocom T-Money" : "Moov Flooz"})</div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={telechargerRecu}
                  className="mag-btn-primary"
                  style={{ background: "#16324F", display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.6rem" }}
                  disabled={enCoursPdf}
                >
                  {enCoursPdf ? <span className="react-spinner"></span> : "📄 Telecharger le Recu Officiel PDF"}
                </button>
                <button type="button" onClick={onFermer} className="mag-btn-secondary" style={{ padding: "0.65rem 1.4rem" }}>
                  Fermer
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
