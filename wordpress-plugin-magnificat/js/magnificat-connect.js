/**
 * Gestionnaire Frontend du plugin Magnificat Connect pour WordPress
 * - Soumission AJAX sécurisée du formulaire de demande d'accès
 * - Chargement dynamique des annonces officielles depuis l'API Django
 */
document.addEventListener("DOMContentLoaded", function () {
  var selectTypeCompte = document.getElementById("mag_type_compte");
  var blocParent = document.getElementById("mag-bloc-parent");
  var blocEnseignant = document.getElementById("mag-bloc-enseignant");
  var form = document.getElementById("mag-formulaire-inscription");
  var btnEnvoyer = document.getElementById("mag-btn-envoyer");
  var blocStatut = document.getElementById("mag-message-statut");
  var conteneurAnnonces = document.getElementById("mag-annonces-liste");

  // 0. Animation dynamique Outlined Floating Label (Material Design)
  var tousChamps = document.querySelectorAll(".mag-champ-groupe");
  tousChamps.forEach(function (groupe) {
    var champ = groupe.querySelector(".mag-input");
    if (!champ) return;

    function verifierEtat() {
      if (champ.value && champ.value.trim().length > 0) {
        groupe.classList.add("mag-rempli");
      } else {
        groupe.classList.remove("mag-rempli");
      }
    }

    // Initialisation
    if (champ.tagName.toLowerCase() === "select" || (champ.value && champ.value.trim().length > 0)) {
      groupe.classList.add("mag-rempli");
    }

    champ.addEventListener("focus", function () {
      groupe.classList.add("mag-focus");
    });

    champ.addEventListener("blur", function () {
      groupe.classList.remove("mag-focus");
      verifierEtat();
    });

    champ.addEventListener("input", verifierEtat);
    champ.addEventListener("change", verifierEtat);
  });

  // 1. Basculement dynamique Parent / Enseignant
  if (selectTypeCompte && blocParent && blocEnseignant) {
    selectTypeCompte.addEventListener("change", function () {
      if (this.value === "enseignant") {
        blocParent.style.display = "none";
        blocEnseignant.style.display = "block";
      } else {
        blocParent.style.display = "block";
        blocEnseignant.style.display = "none";
      }
    });
  }

  // 2. Soumission sécurisée de la demande d'accès vers l'API Django
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!window.magnificatConfig || !window.magnificatConfig.apiUrl) {
        afficherStatut("Configuration de l'API introuvable. Veuillez vérifier les réglages du plugin dans WordPress.", "erreur");
        return;
      }

      btnEnvoyer.disabled = true;
      btnEnvoyer.innerText = "Transmission en cours...";
      masquerStatut();

      var typeCompte = document.getElementById("mag_type_compte").value;
      var nom = document.getElementById("mag_nom").value.trim();
      var prenom = document.getElementById("mag_prenom").value.trim();
      var telephone = document.getElementById("mag_telephone").value.trim();
      var email = document.getElementById("mag_email").value.trim();
      var username = document.getElementById("mag_username").value.trim();
      var password = document.getElementById("mag_password").value;
      var profession = document.getElementById("mag_profession") ? document.getElementById("mag_profession").value.trim() : "";
      var specialite = document.getElementById("mag_specialite") ? document.getElementById("mag_specialite").value.trim() : "";

      var payload = {
        type_compte: typeCompte,
        last_name: nom,
        first_name: prenom,
        username_souhaite: username,
        password: password,
        telephone: telephone,
        email: email,
      };

      if (typeCompte === "parent") {
        payload.profession = profession;
      } else {
        payload.specialite = specialite;
      }

      try {
        var urlApi = window.magnificatConfig.apiUrl.replace(/\/+$/, "") + "/demandes-acces/";
        var reponse = await fetch(urlApi, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (reponse.ok) {
          form.reset();
          if (selectTypeCompte) {
            selectTypeCompte.dispatchEvent(new Event("change"));
          }
          afficherStatut(
            "Votre demande d'accès a été transmise avec succès au secrétariat du Complexe Scolaire Magnificat. Après vérification administrative, vos identifiants d'accès vous seront confirmés par courriel ou SMS.",
            "succes"
          );
        } else {
          var donneesErreur = null;
          try {
            donneesErreur = await reponse.json();
          } catch (errParsing) {
            donneesErreur = null;
          }

          var messageErreur = extraireMessage(donneesErreur, "Impossible de valider votre demande. Veuillez vérifier vos informations.");
          afficherStatut(messageErreur, "erreur");
        }
      } catch (errReseau) {
        afficherStatut(
          "Impossible de joindre le serveur central de l'école. Veuillez vérifier votre connexion Internet et réessayer.",
          "erreur"
        );
      } finally {
        btnEnvoyer.disabled = false;
        btnEnvoyer.innerText = "Transmettre ma Demande au Secrétariat";
      }
    });
  }

  // 3. Chargement dynamique des annonces officielles
  if (conteneurAnnonces && window.magnificatConfig && window.magnificatConfig.apiUrl) {
    chargerAnnonces();
  }

  async function chargerAnnonces() {
    try {
      var urlAnnonces = window.magnificatConfig.apiUrl.replace(/\/+$/, "") + "/annonces/";
      var rep = await fetch(urlAnnonces, { headers: { Accept: "application/json" } });
      if (!rep.ok) throw new Error("Erreur de chargement");
      var data = await rep.json();
      var annonces = Array.isArray(data) ? data : (data.results || []);

      if (annonces.length === 0) {
        conteneurAnnonces.innerHTML = '<div class="mag-chargement">Aucune annonce publique pour le moment.</div>';
        return;
      }

      var html = "";
      annonces.forEach(function (ann) {
        var dateAffichee = ann.date_publication ? new Date(ann.date_publication).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
        html += '<div class="mag-annonce-carte">';
        html += '  <div class="mag-annonce-meta">';
        html += '    <span class="mag-annonce-badge">Communiqué Officiel</span>';
        if (dateAffichee) {
          html += '    <span class="mag-annonce-date">' + dateAffichee + '</span>';
        }
        html += '  </div>';
        html += '  <h4 class="mag-annonce-titre">' + echapperHtml(ann.titre) + '</h4>';
        html += '  <p class="mag-annonce-texte">' + echapperHtml(ann.contenu) + '</p>';
        html += '</div>';
      });

      conteneurAnnonces.innerHTML = html;
    } catch (e) {
      conteneurAnnonces.innerHTML = '<div class="mag-chargement">Impossible de charger les annonces en direct.</div>';
    }
  }

  // 4. Vérification AJAX in situ de bulletin certifié officiel
  var formVerifier = document.getElementById("mag-form-verifier-bulletin");
  var inputIdBulletin = document.getElementById("mag_id_bulletin");
  var btnVerifier = document.getElementById("mag-btn-verifier");
  var conteneurResultatVerif = document.getElementById("mag-resultat-verification");

  if (formVerifier && conteneurResultatVerif) {
    formVerifier.addEventListener("submit", async function (e) {
      e.preventDefault();
      var id = inputIdBulletin.value.trim();
      if (!id) return;

      var apiUrl = window.magnificatConfig && window.magnificatConfig.apiUrl ? window.magnificatConfig.apiUrl.replace(/\/+$/, "") : "";
      if (!apiUrl) {
        conteneurResultatVerif.style.display = "block";
        conteneurResultatVerif.innerHTML = '<div class="mag-alerte mag-alerte-erreur">Configuration API manquante.</div>';
        return;
      }

      if (btnVerifier) {
        btnVerifier.disabled = true;
        btnVerifier.innerText = "Contrôle en cours...";
      }

      conteneurResultatVerif.style.display = "block";
      conteneurResultatVerif.innerHTML = '<div class="mag-chargement" style="padding:14px; text-align:center;">Interrogation du registre central officiel...</div>';

      try {
        var resp = await fetch(apiUrl + "/bulletins/" + encodeURIComponent(id) + "/verifier/", {
          headers: { Accept: "application/json" },
        });

        if (resp.ok) {
          var cert = await resp.json();
          var htmlCert = '<div class="mag-certificat-carte">';
          htmlCert += '  <div class="mag-certificat-header">';
          htmlCert += '    <div class="mag-sceau-badge">';
          htmlCert += '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
          htmlCert += '      Document Officiellement Certifié Conforme';
          htmlCert += '    </div>';
          htmlCert += '    <span class="mag-certificat-id">Matricule : ' + echapperHtml(cert.matricule) + ' &bull; Réf : #' + cert.bulletin_id + '</span>';
          htmlCert += '  </div>';

          htmlCert += '  <div class="mag-certificat-corps">';
          htmlCert += '    <div class="mag-certificat-ligne"><strong>Élève :</strong> <span>' + echapperHtml(cert.eleve_nom) + '</span></div>';
          htmlCert += '    <div class="mag-certificat-ligne"><strong>Classe :</strong> <span>' + echapperHtml(cert.classe) + ' (' + echapperHtml(cert.annee_scolaire) + ')</span></div>';
          htmlCert += '    <div class="mag-certificat-ligne"><strong>Période :</strong> <span>' + cert.trimestre + 'e Trimestre</span></div>';
          htmlCert += '    <div class="mag-certificat-ligne"><strong>Moyenne Générale :</strong> <div><span class="mag-note-sur-20">' + (cert.moyenne_generale !== null ? cert.moyenne_generale.toFixed(2) : '--') + ' / 20</span> (Rang : ' + echapperHtml(cert.rang) + ')</div></div>';
          htmlCert += '    <div class="mag-certificat-ligne"><strong>Décision du Conseil :</strong> <span class="mag-mention-badge">' + echapperHtml(cert.decision_conseil) + '</span></div>';
          htmlCert += '  </div>';

          htmlCert += '  <div class="mag-certificat-actions">';
          htmlCert += '    <a href="' + echapperHtml(cert.url_officielle) + '" target="_blank" rel="noopener noreferrer" class="mag-btn-certificat">';
          htmlCert += '      Consulter la fiche légale d\'attestation &rarr;';
          htmlCert += '    </a>';
          htmlCert += '  </div>';
          htmlCert += '</div>';

          conteneurResultatVerif.innerHTML = htmlCert;
        } else {
          conteneurResultatVerif.innerHTML =
            '<div class="mag-alerte mag-alerte-erreur" style="margin-top:12px;">' +
            '  <strong>DOCUMENT NON CONFORME :</strong><br>' +
            '  Le numéro de bulletin <strong>#' + echapperHtml(id) + '</strong> est introuvable dans le registre officiel de l\'établissement.<br>' +
            '  Ce document présente un risque très élevé de falsification.' +
            '</div>';
        }
      } catch (err) {
        conteneurResultatVerif.innerHTML = '<div class="mag-alerte mag-alerte-erreur">Impossible de joindre le registre de certification en direct.</div>';
      } finally {
        if (btnVerifier) {
          btnVerifier.disabled = false;
          btnVerifier.innerText = "Vérifier l'Authenticité";
        }
      }
    });
  }

  // 5. Statistiques scolaires dynamiques en temps réel
  chargerStatistiquesPubliques();

  async function chargerStatistiquesPubliques() {
    if (!window.magnificatConfig || !window.magnificatConfig.apiUrl) return;
    try {
      var urlIdentite = window.magnificatConfig.apiUrl.replace(/\/+$/, "") + "/identite-publique/";
      var rep = await fetch(urlIdentite, { headers: { Accept: "application/json" } });
      if (!rep.ok) return;
      var data = await rep.json();
      if (!data || !data.statistiques) return;

      var stats = data.statistiques;
      animerCompteur("mag-stat-eleves", stats.total_eleves || 18);
      animerCompteur("mag-stat-classes", stats.total_classes || 3);
      animerCompteur("mag-stat-profs", stats.total_enseignants || 4);
      var elReussite = document.getElementById("mag-stat-reussite");
      if (elReussite && stats.taux_reussite) {
        elReussite.innerText = stats.taux_reussite;
      }
    } catch (_) {}
  }

  function animerCompteur(elementId, valeurFinale) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var debut = 0;
    var fin = parseInt(valeurFinale, 10);
    if (isNaN(fin)) { el.innerText = valeurFinale; return; }
    var duree = 900;
    var pasTemps = 30;
    var etapes = duree / pasTemps;
    var increment = (fin - debut) / etapes;
    var actuel = debut;
    var timer = setInterval(function () {
      actuel += increment;
      if (actuel >= fin) {
        actuel = fin;
        clearInterval(timer);
      }
      el.innerText = Math.round(actuel);
    }, pasTemps);
  }

  // 6. Chargement dynamique du calendrier scolaire officiel
  var conteneurAgenda = document.getElementById("mag-agenda-liste");
  if (conteneurAgenda && window.magnificatConfig && window.magnificatConfig.apiUrl) {
    chargerAgenda();
  }

  async function chargerAgenda() {
    try {
      var urlEvenements = window.magnificatConfig.apiUrl.replace(/\/+$/, "") + "/evenements/";
      var rep = await fetch(urlEvenements, { headers: { Accept: "application/json" } });
      if (!rep.ok) throw new Error("Erreur");
      var data = await rep.json();
      var evenements = Array.isArray(data) ? data : (data.results || []);

      if (evenements.length === 0) {
        conteneurAgenda.innerHTML = '<div class="mag-chargement">Aucun événement répertorié pour le moment.</div>';
        return;
      }

      var html = "";
      var moisFr = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

      evenements.forEach(function (ev) {
        var dDeb = ev.date_debut ? new Date(ev.date_debut + "T00:00:00") : new Date();
        var jour = dDeb.getDate();
        var mois = moisFr[dDeb.getMonth()];

        var typeCls = "mag-agenda-type-autre";
        var typeNom = "Événement";
        var tMin = (ev.titre || "").toLowerCase();
        if (tMin.indexOf("congé") >= 0 || tMin.indexOf("vacance") >= 0 || tMin.indexOf("détente") >= 0) {
          typeCls = "mag-agenda-type-conge";
          typeNom = "Congés & Vacances";
        } else if (tMin.indexOf("composition") >= 0 || tMin.indexOf("examen") >= 0 || tMin.indexOf("bepc") >= 0 || tMin.indexOf("bac") >= 0) {
          typeCls = "mag-agenda-type-examen";
          typeNom = "Évaluations & Examens";
        } else if (tMin.indexOf("fête") >= 0 || tMin.indexOf("indépendance") >= 0) {
          typeCls = "mag-agenda-type-fete";
          typeNom = "Fête Officielle";
        }

        var periodeStr = "";
        if (ev.date_debut && ev.date_fin && ev.date_debut !== ev.date_fin) {
          periodeStr = "Du " + formaterDateFr(ev.date_debut) + " au " + formaterDateFr(ev.date_fin);
        } else if (ev.date_debut) {
          periodeStr = formaterDateFr(ev.date_debut);
        }

        html += '<div class="mag-agenda-carte">';
        html += '  <div class="mag-agenda-date-box">';
        html += '    <div class="mag-agenda-jour">' + (jour < 10 ? "0" + jour : jour) + '</div>';
        html += '    <div class="mag-agenda-mois">' + mois + '</div>';
        html += '  </div>';
        html += '  <div class="mag-agenda-info">';
        html += '    <span class="mag-agenda-type ' + typeCls + '">' + typeNom + '</span>';
        html += '    <h4 class="mag-agenda-titre">' + echapperHtml(ev.titre) + '</h4>';
        if (periodeStr) {
          html += '    <div class="mag-agenda-periode">' + periodeStr + '</div>';
        }
        if (ev.description) {
          html += '    <p class="mag-annonce-texte" style="margin-top:6px; font-size:12px;">' + echapperHtml(ev.description) + '</p>';
        }
        html += '  </div>';
        html += '</div>';
      });

      conteneurAgenda.innerHTML = html;
    } catch (_) {
      conteneurAgenda.innerHTML = '<div class="mag-chargement">Impossible de charger le calendrier scolaire.</div>';
    }
  }

  function formaterDateFr(isoStr) {
    if (!isoStr) return "";
    var p = isoStr.split("-");
    if (p.length === 3) {
      return p[2] + "/" + p[1] + "/" + p[0];
    }
    return isoStr;
  }

  function afficherStatut(message, type) {
    if (!blocStatut) return;
    blocStatut.style.display = "block";
    blocStatut.className = "mag-alerte " + (type === "succes" ? "mag-alerte-succes" : "mag-alerte-erreur");
    blocStatut.innerText = message;
    blocStatut.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function masquerStatut() {
    if (!blocStatut) return;
    blocStatut.style.display = "none";
  }

  function extraireMessage(donnees, repli) {
    if (!donnees || typeof donnees !== "object") return repli;
    if (typeof donnees.detail === "string") return donnees.detail;
    var messages = [];
    Object.keys(donnees).forEach(function (cle) {
      var val = donnees[cle];
      if (Array.isArray(val)) {
        messages.push(val.join(" "));
      } else if (typeof val === "string") {
        messages.push(val);
      }
    });
    return messages.length > 0 ? messages.join(" ") : repli;
  }

  function echapperHtml(texte) {
    if (!texte) return "";
    var div = document.createElement("div");
    div.textContent = texte;
    return div.innerHTML;
  }
});
