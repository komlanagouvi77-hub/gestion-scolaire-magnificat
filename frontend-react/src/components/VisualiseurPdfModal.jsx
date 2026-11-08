// src/components/VisualiseurPdfModal.jsx
import { useState, useEffect, useRef } from "react";
import { Download, Printer, X, FileText, Check, AlertCircle } from "lucide-react";
import { telechargerBlob } from "../telecharger.js";

export default function VisualiseurPdfModal({
  ouvert,
  onFermer,
  blob,
  nomFichier,
  titreDoc,
  langue,
}) {
  const [urlObjet, setUrlObjet] = useState(null);
  const [imprime, setImprime] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (ouvert && blob) {
      const url = window.URL.createObjectURL(blob);
      setUrlObjet(url);
      return () => {
        window.URL.revokeObjectURL(url);
      };
    } else {
      setUrlObjet(null);
    }
  }, [ouvert, blob]);

  if (!ouvert || !blob) return null;

  const imprimerDoc = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        setImprime(true);
        setTimeout(() => setImprime(false), 3000);
      } else {
        window.print();
      }
    } catch (_) {
      window.print();
    }
  };

  const telecharger = async () => {
    await telechargerBlob(blob, nomFichier || "document_officiel.pdf");
  };

  return (
    <div className="react-pdf-overlay" onClick={onFermer} role="dialog" aria-modal="true">
      <div className="react-pdf-boite" onClick={(e) => e.stopPropagation()}>
        {/* Entête de la visionneuse */}
        <div className="react-pdf-entete">
          <div className="react-pdf-titre-zone">
            <div className="react-pdf-icone-doc">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="react-pdf-titre">
                {titreDoc || (langue === "en" ? "Document Viewer" : "Visualisation du document officiel")}
              </h3>
              <span className="react-pdf-nom-fichier">{nomFichier}</span>
            </div>
          </div>

          <div className="react-pdf-actions">
            <button
              type="button"
              className="react-pdf-btn-action"
              onClick={imprimerDoc}
              title={langue === "en" ? "Print document" : "Imprimer directement"}
            >
              <Printer size={16} />
              <span>{langue === "en" ? "Print" : "Imprimer"}</span>
            </button>

            <button
              type="button"
              className="react-pdf-btn-action react-pdf-btn-primaire"
              onClick={telecharger}
              title={langue === "en" ? "Download file" : "Télécharger le PDF"}
            >
              <Download size={16} />
              <span>{langue === "en" ? "Download" : "Télécharger"}</span>
            </button>

            <button
              type="button"
              className="react-pdf-btn-fermer"
              onClick={onFermer}
              title={langue === "en" ? "Close" : "Fermer"}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corps iframe / PDF */}
        <div className="react-pdf-corps">
          {urlObjet ? (
            <iframe
              ref={iframeRef}
              src={urlObjet}
              title={titreDoc || "Aperçu PDF"}
              className="react-pdf-iframe"
            />
          ) : (
            <div className="react-pdf-chargement">
              <span className="react-pdf-chargement-texte">
                {langue === "en" ? "Loading PDF document..." : "Préparation du document PDF..."}
              </span>
            </div>
          )}
        </div>

        {/* Pied d'information */}
        <div className="react-pdf-pied">
          <span className="react-pdf-badge-certifie">
            <Check size={13} /> {langue === "en" ? "Authentic digital document with official QR code" : "Document officiel certifié avec QR Code de vérification"}
          </span>
          <span className="react-pdf-aide-clavier">
            {langue === "en" ? "Press Esc to close" : "Appuyez sur Échap pour fermer"}
          </span>
        </div>
      </div>
    </div>
  );
}
