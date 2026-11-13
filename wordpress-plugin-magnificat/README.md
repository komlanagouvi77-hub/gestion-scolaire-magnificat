# Plugin WordPress : Magnificat Connect

**Passerelle officielle entre le site vitrine WordPress et le Système Intégré de Gestion Scolaire (ERP Django / React) du Complexe Scolaire Magnificat.**

---

## 1. Description du Plugin

Ce plugin WordPress permet d'interconnecter facilement un site vitrine institutionnel sous WordPress avec le moteur de gestion scolaire Django/React sans écrire une seule ligne de PHP supplémentaire.

Il apporte :
1. **Le Pavé d'Accès Officiel (`[magnificat_portail]`)** : un bloc institutionnel moderne avec bouton d'accès direct vers le portail web (`/app/#/connexion`) et rappel des espaces disponibles (Direction, Enseignants, Parents).
2. **Le Formulaire de Demande d'Accès Sécurisé (`[magnificat_demande_acces]`)** : formulaire d'inscription en direct pour les futurs parents et enseignants, connecté à l'API Django (`POST /api/demandes-acces/`). Les mots de passe sont hachés en PBKDF2 et la demande apparaît instantanément dans l'espace Administrateur pour validation.
3. **Le Panneau de Réglages dans l'Administration WordPress** : modifiez l'adresse de votre serveur Django et l'adresse de votre portail React en 1 clic sans toucher au code.

---

## 2. Installation Pas à Pas

### Étape 1 : Copier le dossier dans votre WordPress
Copiez l'intégralité du dossier `wordpress-plugin-magnificat/` dans le répertoire des plugins de votre installation WordPress :
```text
wp-content/plugins/magnificat-connect/
```

### Étape 2 : Activer le Plugin
1. Connectez-vous à l'administration de votre site WordPress (`https://votre-site.tg/wp-admin`).
2. Allez dans le menu **Extensions > Extensions installées**.
3. Recherchez **Magnificat Connect — Passerelle Scolaire Officielle** et cliquez sur **Activer**.

### Étape 3 : Configurer les Adresses dans WordPress
1. Allez dans le menu **Réglages > Magnificat Connect**.
2. Renseignez l'adresse de votre application scolaire :
   - **URL de l'Application Scolaire** : `https://gestion-scolaire-magnificat-vcov.onrender.com/app/` *(ou `http://127.0.0.1:8000/app/` en test local)*
   - **URL de l'API REST** : `https://gestion-scolaire-magnificat-vcov.onrender.com/api` *(ou `http://127.0.0.1:8000/api` en test local)*
3. Cliquez sur **Enregistrer les Réglages**.

---

## 3. Utilisation des Shortcodes

Vous pouvez insérer ces shortcodes dans n'importe quel constructeur de page (Éditeur de blocs Gutenberg, Elementor, Divi, ou widget texte) :

### A. Afficher le bouton d'accès au portail
Dans votre page d'accueil ou en bas de page :
```text
[magnificat_portail]
```

### B. Créer une page "Demande d'Admission / Inscription"
1. Créez une nouvelle page WordPress : **Pages > Ajouter une page** (ex: *Demande d'Accès Portail*).
2. Insérez un bloc **Code court (Shortcode)** et écrivez :
   ```text
   [magnificat_demande_acces]
   ```
3. Publiez la page. Les parents peuvent désormais remplir leur formulaire depuis votre site WordPress et la demande arrive directement dans votre administration Django !

---

## 4. Ajouter le Bouton "Portail Scolaire" dans le Menu du Site

1. Dans l'administration WordPress, allez dans **Apparence > Menus**.
2. Dans la colonne de gauche, déroulez l'onglet **Liens personnalisés**.
3. Renseignez :
   - **URL** : `https://gestion-scolaire-magnificat-vcov.onrender.com/app/`
   - **Texte du lien** : `Espace École` *(ou `Portail Familles`)*
4. Cliquez sur **Ajouter au menu**, puis sur **Enregistrer le menu**.
