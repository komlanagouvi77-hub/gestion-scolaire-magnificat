// src/components/ModalPaiementMobileMoney.jsx
// Modal interactif de paiement Mobile Money pour le Togo :
// - Togocom T-Money (*145#)
// - Moov Africa Flooz (*155#)
// Supporte l'API FedaPay et le mode de validation instantane pour la soutenance.
import { useState, useEffect } from "react";
import { initierMobileMoney, validerMobileMoney, telechargerRecuPaiementPdf } from "../api.js";
import { traduireTexte, localeActive } from "../localisation.js";
import Spinner from "./Spinner.jsx";
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
  },
  {
    id: "flooz",
    nom: "Flooz",
    reseau: "Moov Africa (*155#)",
    couleur: "#0D47A1",
    bg: "#E3F2FD",
    bordure: "#64B5F6",
    prefixe: "96, 97, 98, 99",
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
  const [telephone, setTelephone] = useState("");
  
  // etapes : "formulaire", "attente_ussd", "succes"
  const [etape, setEtape] = useState("formulaire");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [infoTransaction, setInfoTransaction] = useState(null);
  const [paiementValide, setPaiementValide] = useState(null);
  const [enCoursPdf, setEnCoursPdf] = useState(false);

  useEffect(function () {
    const gererEchap = function (e) {
      if (e.key === "Escape" && etape !== "attente_ussd") onFermer();
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
      setErreur("Veuillez renseigner un numero de telephone togolais valide (ex: 90 12 34 56).");
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
    setChargement(true);
    setErreur(null);
    try {
      const res = await validerMobileMoney(token, {
        reference: infoTransaction.reference,
      });
      setPaiementValide(res);
      setEtape("succes");
      if (onSucces) onSucces(res);
    } catch (err) {
      setErreur(err.message || "Echec de validation de la transaction.");
    } finally {
      setChargement(false);
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

  return (
    <div className="react-modal-fond" onClick={onFermer} role="dialog" aria-modal="true">
      <div
        className="react-modal-boite"
        style={{ maxWidth: "560px", width: "94%", borderRadius: "12px", overflow: "hidden" }}
        onClick={function (e) { e.stopPropagation(); }}
      >
        {/* En-tete officiel */}
        <div style={{ background: "linear-gradient(135deg, #16324F 0%, #1e4a73 100%)", padding: "1.2rem 1.5rem", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <span style={{ fontSize: "1.8rem" }}>📲</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Paiement Mobile Money</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.85 }}>Togocom T-Money &amp; Moov Africa Flooz</p>
              </div>
            </div>
            {etape !== "attente_ussd" ? (
              <button
                type="button"
                onClick={onFermer}
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer", opacity: 0.8 }}
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
              {/* Choix Operateur */}
              <div style={{ marginBottom: "1.2rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Selectionnez votre operateur
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                  {OPERATEURS.map(function (op) {
                    const estActif = operateur === op.id;
                    return (
                      <div
                        key={op.id}
                        onClick={function () { setOperateur(op.id); }}
                        style={{
                          border: "2px solid " + (estActif ? op.couleur : "var(--line, #e2e8f0)"),
                          background: estActif ? op.bg : "var(--bg-card, #fff)",
                          borderRadius: "8px",
                          padding: "0.8rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "1rem", color: op.couleur }}>{op.nom}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--ink-600, #64748b)", marginTop: "0.2rem" }}>{op.reseau}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--ink-500, #94a3b8)", marginTop: "0.1rem" }}>{op.prefixe}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Choix Eleve */}
              {eleves.length > 1 ? (
                <div className="mag-field" style={{ marginBottom: "1rem" }}>
                  <label htmlFor="mm-eleve">Eleve beneficiaire</label>
                  <select
                    id="mm-eleve"
                    value={eleveId}
                    onChange={function (e) { setEleveId(e.target.value); }}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}
                    required
                  >
                    {eleves.map(function (el) {
                      return <option key={el.id} value={el.id}>{el.nom} {el.prenom} ({el.matricule})</option>;
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
                  <label htmlFor="mm-montant">Montant (FCFA)</label>
                  <input
                    id="mm-montant"
                    type="number"
                    min="100"
                    step="500"
                    value={montant}
                    onChange={function (e) { setMontant(e.target.value); }}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "6px" }}
                    required
                  />
                </div>
              </div>

              {/* Numero de telephone */}
              <div className="mag-field" style={{ marginBottom: "1.4rem" }}>
                <label htmlFor="mm-tel">Numero de telephone debiteur ({operateur === "tmoney" ? "T-Money" : "Flooz"})</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ padding: "0.6rem 0.8rem", background: "var(--bg-muted, #f1f5f9)", border: "1px solid var(--line)", borderRight: "none", borderRadius: "6px 0 0 6px", fontWeight: 600, fontSize: "0.85rem" }}>
                    +228
                  </span>
                  <input
                    id="mm-tel"
                    type="tel"
                    placeholder="Ex: 90 12 34 56"
                    value={telephone}
                    onChange={function (e) { setTelephone(e.target.value); }}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--line)", borderRadius: "0 6px 6px 0" }}
                    required
                  />
                </div>
                <small style={{ color: "var(--ink-500)", fontSize: "0.75rem", display: "block", marginTop: "0.3rem" }}>
                  Un message de confirmation USSD sera envoye sur cette ligne.
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem" }}>
                <button type="button" onClick={onFermer} className="mag-btn-secondary" disabled={chargement}>
                  Annuler
                </button>
                <button
                  type="submit"
                  className="mag-btn-primary"
                  style={{
                    background: operateur === "tmoney" ? "#E65100" : "#0D47A1",
                    borderColor: operateur === "tmoney" ? "#E65100" : "#0D47A1",
                  }}
                  disabled={chargement}
                >
                  {chargement ? <span className="react-spinner"></span> : "Payer " + Number(montant).toLocaleString(localeActive()) + " FCFA"}
                </button>
              </div>
            </form>
          ) : null}

          {/* ETAPE 2 : ATTENTE VALIDATION USSD PUSH */}
          {etape === "attente_ussd" && infoTransaction ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: operateur === "tmoney" ? "#FFF3E0" : "#E3F2FD",
                  color: operateur === "tmoney" ? "#E65100" : "#0D47A1",
                  fontSize: "2.2rem",
                  marginBottom: "1rem",
                }}
              >
                📲
              </div>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.15rem", fontWeight: "700" }}>
                Demande transmise a {infoTransaction.operateur_nom}
              </h4>
              <p style={{ color: "var(--ink-700)", fontSize: "0.9rem", lineHeight: "1.4", margin: "0 0 1rem 0" }}>
                {infoTransaction.instructions}
              </p>

              <div
                style={{
                  background: "var(--bg-muted, #f8fafc)",
                  border: "1px dashed var(--line, #cbd5e1)",
                  borderRadius: "8px",
                  padding: "0.9rem",
                  margin: "1rem auto 1.5rem auto",
                  maxWidth: "400px",
                  fontSize: "0.85rem",
                  textAlign: "left",
                }}
              >
                <div><strong>Reference interne :</strong> {infoTransaction.reference}</div>
                <div><strong>Montant a debiter :</strong> {Number(infoTransaction.montant).toLocaleString(localeActive())} FCFA</div>
                <div><strong>Numero associe :</strong> +228 {infoTransaction.telephone}</div>
              </div>

              {infoTransaction.fedapay_url ? (
                <div style={{ marginBottom: "1.2rem" }}>
                  <a
                    href={infoTransaction.fedapay_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mag-btn-primary"
                    style={{ display: "inline-block", background: "#059669", textDecoration: "none", marginBottom: "0.8rem" }}
                  >
                    Ouvrir le guichet securise FedaPay
                  </a>
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={function () { setEtape("formulaire"); }}
                  className="mag-btn-secondary"
                  disabled={chargement}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={confirmerValidationUSSD}
                  className="mag-btn-primary"
                  style={{
                    background: operateur === "tmoney" ? "#E65100" : "#0D47A1",
                    padding: "0.6rem 1.6rem",
                  }}
                  disabled={chargement}
                >
                  {chargement ? <span className="react-spinner"></span> : "✓ Valider le paiement"}
                </button>
              </div>
            </div>
          ) : null}

          {/* ETAPE 3 : SUCCES ET RECU OFFICIEL */}
          {etape === "succes" && paiementValide ? (
            <div style={{ textAlign: "center", padding: "1.2rem 0" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "#DCFCE7",
                  color: "#16A34A",
                  fontSize: "2.5rem",
                  marginBottom: "1rem",
                }}
              >
                ✓
              </div>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", color: "#166534", fontWeight: 700 }}>
                Paiement valide avec succes !
              </h4>
              <p style={{ color: "var(--ink-700)", fontSize: "0.9rem", margin: "0 0 1.2rem 0" }}>
                {paiementValide.message}
              </p>

              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: "8px",
                  padding: "1rem",
                  margin: "0 auto 1.5rem auto",
                  maxWidth: "400px",
                  fontSize: "0.85rem",
                  textAlign: "left",
                }}
              >
                <div><strong>Eleve :</strong> {paiementValide.eleve_nom}</div>
                <div><strong>Montant regle :</strong> {Number(paiementValide.montant).toLocaleString(localeActive())} FCFA</div>
                <div><strong>Tranche :</strong> {paiementValide.tranche}e tranche</div>
                <div><strong>Reference transaction :</strong> {paiementValide.reference}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={telechargerRecu}
                  className="mag-btn-primary"
                  style={{ background: "#16324F", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                  disabled={enCoursPdf}
                >
                  {enCoursPdf ? <span className="react-spinner"></span> : "📄 Telecharger le Recu Officiel PDF"}
                </button>
                <button type="button" onClick={onFermer} className="mag-btn-secondary">
                  Terminer
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
