/**
 * Gestionnaire du formulaire de demande d'accès Magnificat pour WordPress
 */
document.addEventListener("DOMContentLoaded", function () {
  var selectTypeCompte = document.getElementById("mag_type_compte");
  var blocParent = document.getElementById("mag-bloc-parent");
  var blocEnseignant = document.getElementById("mag-bloc-enseignant");
  var form = document.getElementById("mag-formulaire-inscription");
  var btnEnvoyer = document.getElementById("mag-btn-envoyer");
  var blocStatut = document.getElementById("mag-message-statut");

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
});
