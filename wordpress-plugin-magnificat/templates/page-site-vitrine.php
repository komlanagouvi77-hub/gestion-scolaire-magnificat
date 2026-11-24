<?php
/**
 * Template Name: Site Vitrine Officiel - Complexe Scolaire Magnificat
 * Description: Modèle pleine largeur institutionnel officiel sans interférence du thème WordPress.
 */

if (!defined('ABSPATH')) {
    exit;
}

$api_url = get_option('magnificat_api_url', MAGNIFICAT_DEFAULT_API_URL);
$app_url = get_option('magnificat_app_url', MAGNIFICAT_DEFAULT_APP_URL);
$racine_serveur = preg_replace('#/api/?$#', '', $api_url);

wp_enqueue_style('magnificat-connect-style');
wp_enqueue_script('magnificat-connect-script');
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?php wp_title('|', true, 'right'); ?> Complexe Scolaire Privé Laïque Magnificat</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet" />
  <?php wp_head(); ?>
</head>
<body <?php body_class('mag-page-template-vitrine'); ?>>

  <!-- 1. Barre Institutionnelle République Togolaise -->
  <div class="mag-top-bar">
    <div class="mag-top-bar-in">
      <div class="mag-top-bar-left">
        <span class="mag-flag-icon">
          <span style="background:#006A4E;"></span>
          <span style="background:#FFCE00;"></span>
          <span style="background:#D21034;"></span>
        </span>
        <span class="mag-republique">RÉPUBLIQUE TOGOLAISE</span>
        <span class="mag-separation">•</span>
        <span class="mag-ministere">Ministère des Enseignements Primaire et Secondaire</span>
      </div>
      <div class="mag-top-bar-right">
        <span class="mag-devise">TRAVAIL • LIBERTÉ • PATRIE</span>
        <span class="mag-separation">•</span>
        <span class="mag-annee">Année Scolaire 2026-2027</span>
      </div>
    </div>
  </div>

  <!-- 2. En-tête Principal Officiel -->
  <header class="mag-header-officiel">
    <div class="mag-header-in">
      <div class="mag-brand">
        <div class="mag-brand-crest">
          <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
            <path d="M24 4L6 11V22C6 33.2 13.7 43.6 24 46C34.3 43.6 42 33.2 42 22V11L24 4Z" fill="#0A2540" stroke="#D4AF37" stroke-width="2.2"/>
            <path d="M16 32V18L24 26L32 18V32" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="24" cy="14" r="2.2" fill="#D4AF37"/>
          </svg>
        </div>
        <div class="mag-brand-text">
          <span class="mag-brand-titre">COMPLEXE SCOLAIRE PRIVÉ LAÏQUE MAGNIFICAT</span>
          <span class="mag-brand-soustitre">De la Maternelle à la Terminale — Agrément Ministériel N° 2024/MEPSTA/SG/DEP</span>
        </div>
      </div>

      <nav class="mag-nav">
        <a href="#presentation" class="mag-nav-link">L'Établissement</a>
        <a href="#cycles" class="mag-nav-link">Cycles d'Études</a>
        <a href="#portail" class="mag-nav-link">Espace Numérique</a>
        <a href="#admissions" class="mag-nav-link">Admissions</a>
        <a href="#annonces" class="mag-nav-link">Communiqués</a>
        <a href="#mag-section-agenda" class="mag-nav-link">Agenda Scolaire</a>
        <a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank" rel="noopener noreferrer" class="mag-btn-header">
          <span>Connexion École</span>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>
        </a>
      </nav>
    </div>
  </header>

  <!-- 3. Bannière Héroïque Institutionnelle -->
  <section class="mag-hero" id="presentation">
    <div class="mag-hero-bg-overlay"></div>
    <div class="mag-hero-in">
      <div class="mag-hero-badge">
        <span class="mag-badge-star">★</span>
        <span>ÉTABLISSEMENT D'EXCELLENCE HOMOLOGUÉ • LOMÉ, TOGO</span>
      </div>
      <h1 class="mag-hero-titre">
        Former l'Élite de Demain par la <span class="mag-accent-or">Rigueur</span> et l'<span class="mag-accent-or">Innovation</span>
      </h1>
      <p class="mag-hero-sous-titre">
        Le Complexe Scolaire Magnificat offre un encadrement pédagogique d'élite de la Maternelle à la Terminale, alliant rigueur morale, bilinguisme et un système d'information académique 100% sécurisé en temps réel.
      </p>

      <div class="mag-hero-actions">
        <a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank" rel="noopener noreferrer" class="mag-hero-btn-primary">
          <span>Accéder au Portail Scolaire</span>
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>
        </a>
        <a href="#admissions" class="mag-hero-btn-secondary">
          <span>Déposer une Demande d'Admission</span>
        </a>
      </div>

      <!-- 4 Piliers Clés d'Excellence -->
      <div class="mag-hero-stats">
        <div class="mag-hstat-card">
          <div class="mag-hstat-chiffre">100%</div>
          <div class="mag-hstat-label">Réussite au BEPC</div>
          <div class="mag-hstat-sub">Session Officielle 2025</div>
        </div>
        <div class="mag-hstat-card">
          <div class="mag-hstat-chiffre">98.4%</div>
          <div class="mag-hstat-label">Réussite au BAC II</div>
          <div class="mag-hstat-sub">Séries Scientifiques & Littéraires</div>
        </div>
        <div class="mag-hstat-card">
          <div class="mag-hstat-chiffre">QR Code</div>
          <div class="mag-hstat-label">Bulletins Sécurisés</div>
          <div class="mag-hstat-sub">Certification cryptographique</div>
        </div>
        <div class="mag-hstat-card">
          <div class="mag-hstat-chiffre">T-Money • Flooz</div>
          <div class="mag-hstat-label">Paiements Intégrés</div>
          <div class="mag-hstat-sub">Quittances instantanées</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 3 bis. Bandeau des Statistiques Officielles en Direct (API Django) -->
  <section class="mag-stats-live-section" style="margin-top:-45px; position:relative; z-index:10; padding:0 24px;">
    <div class="mag-conteneur">
      <?php echo magnificat_statistiques_shortcode(array()); ?>
    </div>
  </section>

  <!-- 4. Section Cycles d'Enseignement -->
  <section class="mag-section" id="cycles">
    <div class="mag-conteneur">
      <div class="mag-section-header">
        <span class="mag-section-sur-titre">PROGRAMME ACADÉMIQUE COMPLET</span>
        <h2 class="mag-section-titre">Nos Cycles d'Enseignement</h2>
        <p class="mag-section-desc">Un continuum pédagogique complet favorisant l'épanouissement intellectuel, civique et technologique de chaque apprenant.</p>
      </div>

      <div class="mag-cycles-grille">
        <div class="mag-cycle-carte">
          <div class="mag-cycle-icone" style="background:#EBF5FF; color:#1E40AF;">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h3>Cycle Primaire & Maternelle</h3>
          <p class="mag-cycle-niveaux">De la Petite Section au CM2</p>
          <p class="mag-cycle-texte">Apprentissage fondamental de la lecture, de l'écriture et du calcul. Initiation précoce à l'anglais et à l'informatique dans un cadre bienveillant et stimulant.</p>
          <ul class="mag-cycle-liste">
            <li>Éveil scientifique et linguistique renforcé</li>
            <li>Suivi individualisé des compétences fondamentales</li>
            <li>Activités périscolaires et culturelles</li>
          </ul>
        </div>

        <div class="mag-cycle-carte mag-cycle-vedette">
          <div class="mag-cycle-badge-vedette">CYCLE PHARE</div>
          <div class="mag-cycle-icone" style="background:#FEF3C7; color:#92400E;">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <h3>Premier Cycle du Secondaire</h3>
          <p class="mag-cycle-niveaux">Collège : De la 6e à la 3e</p>
          <p class="mag-cycle-texte">Rigueur méthodologique, renforcement en sciences exactes et lettres. Préparation intensive et personnalisée à l'examen d'État du BEPC.</p>
          <ul class="mag-cycle-liste">
            <li>Devoirs surveillés hebdomadaires & bilans trimestriels</li>
            <li>Laboratoire expérimental de sciences physiques et SVT</li>
            <li>Taux historique de 100% de réussite au BEPC</li>
          </ul>
        </div>

        <div class="mag-cycle-carte">
          <div class="mag-cycle-icone" style="background:#F0FDF4; color:#166534;">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <h3>Second Cycle du Secondaire</h3>
          <p class="mag-cycle-niveaux">Lycée : Séries A4, C & D (2nde à Terminale)</p>
          <p class="mag-cycle-texte">Orientation stratégique et préparation d'élite aux concours nationaux et aux études universitaires internationales d'ingénierie et de médecine.</p>
          <ul class="mag-cycle-liste">
            <li>Séries Scientifiques (C, D) et Littéraire (A4)</li>
            <li>Examens blancs départementaux en conditions réelles</li>
            <li>Mentorat académique et orientation post-bac</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- 5. Section Espace Numérique & Portail Scolaire -->
  <section class="mag-section mag-section-alt" id="portail">
    <div class="mag-conteneur">
      <div class="mag-section-header">
        <span class="mag-section-sur-titre">SYSTÈME INTÉGRÉ DE GESTION SCOLAIRE</span>
        <h2 class="mag-section-titre">Le Portail Numérique Officiel</h2>
        <p class="mag-section-desc">Une plateforme web de dernière génération connectant instantanément l'Administration, le Corps Enseignant et les Parents d'élèves.</p>
      </div>

      <div class="mag-portail-pro-wrapper">
        <?php echo magnificat_portail_shortcode(array()); ?>
      </div>

      <div class="mag-features-grille">
        <div class="mag-feature-item">
          <div class="mag-feature-icone">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <h4>Suivi des Notes & Bulletins</h4>
          <p>Consultation instantanée des moyennes, classements et téléchargement des bulletins officiels certifiés au format PDF.</p>
        </div>

        <div class="mag-feature-item">
          <div class="mag-feature-icone">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h4>Assiduité & Emploi du Temps</h4>
          <p>Notification en temps réel des absences et retards, et consultation du planning des cours actualisé chaque semaine.</p>
        </div>

        <div class="mag-feature-item">
          <div class="mag-feature-icone">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <h4>Règlements Sécurisés Mobile Money</h4>
          <p>Paiement des frais de scolarité par T-Money ou Flooz avec délivrance automatique d'une quittance de caisse officielle.</p>
        </div>

        <div class="mag-feature-item">
          <div class="mag-feature-icone">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <h4>Messagerie Interne Cloisonnée</h4>
          <p>Canal de communication direct et confidentiel entre parents et professeurs pour un suivi pédagogique rapproché.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 6. Section Admissions & Formulaire Direct -->
  <section class="mag-section" id="admissions">
    <div class="mag-conteneur">
      <div class="mag-admission-split">
        <div class="mag-admission-infos">
          <span class="mag-section-sur-titre">RENTRÉE ACADÉMIQUE 2026-2027</span>
          <h2 class="mag-section-titre" style="text-align:left;">Admissions & Inscriptions</h2>
          <p class="mag-admission-intro">
            Les candidatures pour l'année scolaire 2026-2027 sont ouvertes pour l'ensemble des cycles. Vous pouvez soumettre votre dossier directement en ligne via ce formulaire officiel.
          </p>

          <div class="mag-steps">
            <div class="mag-step-item">
              <div class="mag-step-num">1</div>
              <div class="mag-step-content">
                <h5>Remplissage du Formulaire</h5>
                <p>Complétez les informations requises ci-contre. Votre demande est chiffrée et transmise instantanément à la Direction des Études.</p>
              </div>
            </div>
            <div class="mag-step-item">
              <div class="mag-step-num">2</div>
              <div class="mag-step-content">
                <h5>Examen du Dossier sous 48h</h5>
                <p>La commission pédagogique évalue les antécédents scolaires de l'élève et valide l'affectation dans la classe sollicitée.</p>
              </div>
            </div>
            <div class="mag-step-item">
              <div class="mag-step-num">3</div>
              <div class="mag-step-content">
                <h5>Notification & Activation</h5>
                <p>Vous recevez par SMS et email la confirmation d'admission et vos identifiants pour accéder à l'Espace Parents.</p>
              </div>
            </div>
          </div>

          <div class="mag-contact-secretariat">
            <h4>Secrétariat Général de l'Établissement</h4>
            <p><strong>Adresse :</strong> Quartier Adidogomé-Cacaveli, Lomé, Togo</p>
            <p><strong>Téléphone :</strong> +228 90 00 00 00 / +228 99 00 00 00</p>
            <p><strong>Email :</strong> contact@magnificat-scolaire.tg</p>
            <p><strong>Horaires d'ouverture :</strong> Du Lundi au Vendredi de 07h00 à 17h30 — Samedi de 08h00 à 12h00</p>
          </div>
        </div>

        <div class="mag-admission-form-wrapper">
          <?php echo magnificat_demande_acces_shortcode(array()); ?>
        </div>
      </div>
    </div>
  </section>

  <!-- 7. Section Actualités & Vérification QR -->
  <section class="mag-section mag-section-alt" id="annonces">
    <div class="mag-conteneur">
      <div class="mag-grille-2cols">
        <!-- Flux des Annonces Django -->
        <div>
          <?php echo magnificat_annonces_shortcode(array()); ?>
        </div>

        <!-- Widget Vérification Bulletin -->
        <div>
          <?php echo magnificat_verifier_bulletin_shortcode(array()); ?>
        </div>
      </div>
    </div>
  </section>

  <!-- 7 bis. Calendrier & Agenda Scolaire Officiel -->
  <section class="mag-section" id="mag-section-agenda" style="background:#FFFFFF; border-top:1px solid #E2E8F0;">
    <div class="mag-conteneur">
      <?php echo magnificat_agenda_shortcode(array()); ?>
    </div>
  </section>

  <!-- 8. Pied de Page Institutionnel -->
  <footer class="mag-footer">
    <div class="mag-conteneur">
      <div class="mag-footer-grille">
        <div class="mag-footer-col mag-footer-col-main">
          <div class="mag-brand" style="margin-bottom:14px;">
            <div class="mag-brand-crest">
              <svg viewBox="0 0 48 48" width="34" height="34" fill="none">
                <path d="M24 4L6 11V22C6 33.2 13.7 43.6 24 46C34.3 43.6 42 33.2 42 22V11L24 4Z" fill="#0A2540" stroke="#D4AF37" stroke-width="2"/>
                <path d="M16 32V18L24 26L32 18V32" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="mag-brand-text">
              <span class="mag-brand-titre" style="color:#FFFFFF; font-size:15px;">COMPLEXE SCOLAIRE MAGNIFICAT</span>
              <span class="mag-brand-soustitre" style="color:#94A3B8;">Établissement Privé d'Enseignement Général</span>
            </div>
          </div>
          <p class="mag-footer-desc">
            Institution d'excellence académique à Lomé (Togo), engagée dans la formation intellectuelle, civique et morale des leaders africains de demain.
          </p>
          <div class="mag-flag-band">
            <span style="background:#006A4E;"></span>
            <span style="background:#FFCE00;"></span>
            <span style="background:#D21034;"></span>
          </div>
        </div>

        <div class="mag-footer-col">
          <h4>Navigation</h4>
          <ul class="mag-footer-liens">
            <li><a href="#presentation">L'Établissement</a></li>
            <li><a href="#cycles">Cycles d'Enseignement</a></li>
            <li><a href="#portail">Portail Scolaire ERP</a></li>
            <li><a href="#admissions">Admissions & Tarifs</a></li>
            <li><a href="#annonces">Communiqués Officiels</a></li>
          </ul>
        </div>

        <div class="mag-footer-col">
          <h4>Accès Rapide</h4>
          <ul class="mag-footer-liens">
            <li><a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank">Espace Enseignants</a></li>
            <li><a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank">Espace Parents</a></li>
            <li><a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank">Espace Administration</a></li>
            <li><a href="#annonces">Vérification QR Code</a></li>
          </ul>
        </div>

        <div class="mag-footer-col">
          <h4>Contact Officiel</h4>
          <p class="mag-footer-contact">
            <strong>Localisation :</strong><br />
            Boulevard du 30 Août, Adidogomé, 07 B.P. 13517<br />
            Lomé, République Togolaise (Golfe 7)
          </p>
          <p class="mag-footer-contact">
            <strong>Téléphone :</strong> +228 90 00 00 00<br />
            <strong>Courriel :</strong> contact@magnificat-scolaire.tg
          </p>
        </div>
      </div>

      <div class="mag-footer-bas">
        <span>&copy; <?php echo date('Y'); ?> Complexe Scolaire Privé Laïque Magnificat. Tous droits réservés.</span>
        <span>Système d'Information Scolaire conçu pour la République Togolaise</span>
      </div>
    </div>
  </footer>

  <?php wp_footer(); ?>
</body>
</html>
