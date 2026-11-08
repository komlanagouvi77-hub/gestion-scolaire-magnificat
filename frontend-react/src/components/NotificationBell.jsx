// src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from "react";
import { Bell, Megaphone, MessageSquare, UserPlus, CheckCheck, Clock, ExternalLink } from "lucide-react";
import { lister } from "../api.js";

const CLE_STOCKAGE_LUES = "magnificat_notifications_lues";

function obtenirIdsLues() {
  try {
    const raw = localStorage.getItem(CLE_STOCKAGE_LUES);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function enregistrerIdsLues(ids) {
  try {
    localStorage.setItem(CLE_STOCKAGE_LUES, JSON.stringify(ids));
  } catch (_) {}
}

export default function NotificationBell({ token, role, langue }) {
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState("toutes"); // "toutes" | "non_lues"
  const [notifications, setNotifications] = useState([]);
  const [idsLues, setIdsLues] = useState(obtenirIdsLues());
  const conteneurRef = useRef(null);

  const chargerNotifications = async () => {
    if (!token) return;
    try {
      const items = [];

      // 1. Annonces récentes
      try {
        const annonces = await lister("annonces", token);
        (annonces || []).slice(0, 10).forEach((a) => {
          items.push({
            id: "annonce-" + a.id,
            type: "annonce",
            titre: a.titre || (langue === "en" ? "Announcement" : "Communiqué"),
            texte: a.contenu || "",
            date: a.date_creation || a.date_publication || null,
            lien: "annonces",
            Icone: Megaphone,
            couleur: "var(--indigo-700, #1D4E89)",
          });
        });
      } catch (_) {}

      // 2. Messages récents
      if (role === "enseignant" || role === "parent") {
        try {
          const messages = await lister("messages", token);
          (messages || []).slice(0, 10).forEach((m) => {
            items.push({
              id: "message-" + m.id,
              type: "message",
              titre: m.expediteur_nom ? `${m.expediteur_nom}` : (langue === "en" ? "New message" : "Nouveau message"),
              texte: m.contenu || (m.eleve_nom ? `Concernant ${m.eleve_nom}` : ""),
              date: m.date_envoi || null,
              lien: "messagerie",
              Icone: MessageSquare,
              couleur: "#7C3AED",
            });
          });
        } catch (_) {}
      }

      // 3. Demandes d'inscription en attente (Admin)
      if (role === "administrateur") {
        try {
          const demandes = await lister("demandes-acces", token);
          (demandes || []).forEach((d) => {
            items.push({
              id: "demande-" + d.id,
              type: "demande",
              titre: langue === "en" ? "Access Request" : "Nouvelle demande d'accès",
              texte: `${d.first_name || ""} ${d.last_name || ""} (${d.type_compte === "parent" ? "Parent" : "Enseignant"})`,
              date: d.date_demande || null,
              lien: "demandes-acces",
              Icone: UserPlus,
              couleur: "var(--azur-500, #B08A2E)",
            });
          });
        } catch (_) {}
      }

      // Tri décroissant par date
      items.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

      setNotifications(items);
    } catch (_) {}
  };

  useEffect(() => {
    chargerNotifications();
    const intervalle = setInterval(chargerNotifications, 60000); // Actualisation toutes les minutes
    return () => clearInterval(intervalle);
  }, [token, role]);

  // Fermer quand on clique en dehors
  useEffect(() => {
    const gererClicExterieur = (e) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setOuvert(false);
      }
    };
    if (ouvert) {
      document.addEventListener("mousedown", gererClicExterieur);
    }
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [ouvert]);

  const nonLues = notifications.filter((n) => !idsLues.includes(n.id));
  const listeAffichee = onglet === "non_lues" ? nonLues : notifications;

  const marquerToutCommeLu = () => {
    const tousLesIds = notifications.map((n) => n.id);
    const fusion = Array.from(new Set([...idsLues, ...tousLesIds]));
    setIdsLues(fusion);
    enregistrerIdsLues(fusion);
  };

  const ouvrirNotification = (n) => {
    if (!idsLues.includes(n.id)) {
      const maj = [...idsLues, n.id];
      setIdsLues(maj);
      enregistrerIdsLues(maj);
    }
    window.location.hash = "#/" + n.lien;
    setOuvert(false);
  };

  const formaterDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(langue === "en" ? "en-US" : "fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div className="react-notif-conteneur" ref={conteneurRef}>
      <button
        type="button"
        className={`react-notif-bouton ${ouvert ? "actif" : ""}`}
        onClick={() => setOuvert((v) => !v)}
        title={langue === "en" ? "Notifications" : "Notifications"}
        aria-label={langue === "en" ? "Notifications" : "Notifications"}
      >
        <Bell size={18} />
        {nonLues.length > 0 ? (
          <span className="react-notif-pastille">
            <span className="react-notif-pulse"></span>
            {nonLues.length > 9 ? "9+" : nonLues.length}
          </span>
        ) : null}
      </button>

      {ouvert ? (
        <div className="react-notif-menu" role="menu">
          {/* Entête du volet */}
          <div className="react-notif-menu-entete">
            <div>
              <h4 className="react-notif-titre">
                {langue === "en" ? "Notifications" : "Notifications"}
              </h4>
              <span className="react-notif-sous-titre">
                {nonLues.length}{" "}
                {langue === "en"
                  ? nonLues.length > 1
                    ? "unread"
                    : "unread"
                  : nonLues.length > 1
                  ? "non lues"
                  : "non lue"}
              </span>
            </div>
            {nonLues.length > 0 ? (
              <button
                type="button"
                className="react-notif-marquer-tout"
                onClick={marquerToutCommeLu}
                title={langue === "en" ? "Mark all as read" : "Tout marquer comme lu"}
              >
                <CheckCheck size={14} />
                <span>{langue === "en" ? "Mark read" : "Tout marquer"}</span>
              </button>
            ) : null}
          </div>

          {/* Onglets */}
          <div className="react-notif-onglets">
            <button
              type="button"
              className={`react-notif-onglet ${onglet === "toutes" ? "actif" : ""}`}
              onClick={() => setOnglet("toutes")}
            >
              {langue === "en" ? "All" : "Toutes"} ({notifications.length})
            </button>
            <button
              type="button"
              className={`react-notif-onglet ${onglet === "non_lues" ? "actif" : ""}`}
              onClick={() => setOnglet("non_lues")}
            >
              {langue === "en" ? "Unread" : "Non lues"} ({nonLues.length})
            </button>
          </div>

          {/* Liste des notifications */}
          <div className="react-notif-liste">
            {listeAffichee.length === 0 ? (
              <div className="react-notif-vide">
                <Bell size={26} className="react-notif-vide-icone" />
                <p>
                  {onglet === "non_lues"
                    ? (langue === "en" ? "No unread notifications" : "Aucune notification non lue")
                    : (langue === "en" ? "No notifications yet" : "Aucune notification pour le moment")}
                </p>
                <span>{langue === "en" ? "All notifications have been reviewed." : "Toutes les notifications ont été consultées."}</span>
              </div>
            ) : (
              listeAffichee.map((n) => {
                const estLue = idsLues.includes(n.id);
                const Icone = n.Icone;
                return (
                  <div
                    key={n.id}
                    className={`react-notif-item ${estLue ? "lue" : "non-lue"}`}
                    onClick={() => ouvrirNotification(n)}
                  >
                    <div className="react-notif-item-icone" style={{ color: n.couleur }}>
                      <Icone size={16} />
                    </div>
                    <div className="react-notif-item-corps">
                      <div className="react-notif-item-ligne1">
                        <span className="react-notif-item-titre">{n.titre}</span>
                        {!estLue ? <span className="react-notif-point-bleu"></span> : null}
                      </div>
                      <p className="react-notif-item-texte">{n.texte}</p>
                      {n.date ? (
                        <span className="react-notif-item-date">
                          <Clock size={11} /> {formaterDate(n.date)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pied du volet */}
          <div className="react-notif-menu-pied">
            <button
              type="button"
              className="react-notif-lien-voir-tout"
              onClick={() => {
                window.location.hash = "#/annonces";
                setOuvert(false);
              }}
            >
              {langue === "en" ? "View school announcements" : "Voir les annonces officielles"} →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

