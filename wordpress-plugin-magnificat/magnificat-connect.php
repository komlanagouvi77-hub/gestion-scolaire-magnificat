<?php
/**
 * Plugin Name: Magnificat Connect — Passerelle Scolaire Officielle
 * Plugin URI: https://magnificat-scolaire.tg
 * Description: Connecte votre site vitrine WordPress au Système Intégré de Gestion Scolaire (ERP Django / React) du Complexe Scolaire Magnificat : portail d'accès, formulaire d'inscription en direct, flux des annonces et vérification des bulletins certifiés.
 * Version: 1.1.0
 * Author: Georges AGOUVI
 * Author URI: https://magnificat-scolaire.tg
 * Text Domain: magnificat-connect
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) {
    exit; // Sécurité : interdire l'accès direct
}

define('MAGNIFICAT_CONNECT_VERSION', '1.1.0');
define('MAGNIFICAT_CONNECT_DIR', plugin_dir_path(__FILE__));
define('MAGNIFICAT_CONNECT_URL', plugin_dir_url(__FILE__));

// Valeurs par défaut
define('MAGNIFICAT_DEFAULT_API_URL', 'https://gestion-scolaire-magnificat-vcov.onrender.com/api');
define('MAGNIFICAT_DEFAULT_APP_URL', 'https://gestion-scolaire-magnificat-vcov.onrender.com/app/');

/**
 * Enregistrement des styles et scripts frontend
 */
function magnificat_connect_scripts() {
    wp_register_style(
        'magnificat-google-fonts',
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap',
        array(),
        null
    );

    wp_register_style(
        'magnificat-connect-style',
        MAGNIFICAT_CONNECT_URL . 'css/magnificat-connect.css',
        array('magnificat-google-fonts'),
        MAGNIFICAT_CONNECT_VERSION
    );

    wp_register_script(
        'magnificat-connect-script',
        MAGNIFICAT_CONNECT_URL . 'js/magnificat-connect.js',
        array(),
        MAGNIFICAT_CONNECT_VERSION,
        true
    );

    $api_url = get_option('magnificat_api_url', MAGNIFICAT_DEFAULT_API_URL);
    $app_url = get_option('magnificat_app_url', MAGNIFICAT_DEFAULT_APP_URL);

    wp_localize_script('magnificat-connect-script', 'magnificatConfig', array(
        'apiUrl' => esc_url_raw(rtrim($api_url, '/')),
        'appUrl' => esc_url_raw(rtrim($app_url, '/')),
    ));
}
add_action('wp_enqueue_scripts', 'magnificat_connect_scripts');

/**
 * Menu d'administration WordPress (Réglages > Magnificat Connect)
 */
function magnificat_connect_admin_menu() {
    add_options_page(
        'Passerelle Scolaire Magnificat',
        'Magnificat Connect',
        'manage_options',
        'magnificat-connect',
        'magnificat_connect_admin_page'
    );
}
add_action('admin_menu', 'magnificat_connect_admin_menu');

function magnificat_connect_register_settings() {
    register_setting('magnificat_options_group', 'magnificat_api_url', array(
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => MAGNIFICAT_DEFAULT_API_URL,
    ));
    register_setting('magnificat_options_group', 'magnificat_app_url', array(
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => MAGNIFICAT_DEFAULT_APP_URL,
    ));
}
add_action('admin_init', 'magnificat_connect_register_settings');

function magnificat_connect_admin_page() {
    $api_url = get_option('magnificat_api_url', MAGNIFICAT_DEFAULT_API_URL);
    $app_url = get_option('magnificat_app_url', MAGNIFICAT_DEFAULT_APP_URL);
    ?>
    <div class="wrap">
        <h1 style="color:#0A2540; font-weight:700;">Magnificat Connect — Configuration de la Passerelle Scolaire</h1>
        <p style="font-size:15px; color:#475569;">Connecte ce site vitrine WordPress au système de gestion scolaire Django / React du Complexe Scolaire Magnificat.</p>

        <!-- Test de connectivité en direct -->
        <div style="background:#fff; padding:18px 22px; border:1px solid #cbd5e1; border-radius:10px; max-width:740px; margin:20px 0 25px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
            <h3 style="margin-top:0; color:#0F172A; font-size:16px;">Vérification de la Connectivité API en Temps Réel</h3>
            <p style="font-size:13px; color:#64748B; margin-bottom:12px;">Testez la liaison directe entre ce site WordPress et le serveur Django.</p>
            <button type="button" id="btn-tester-liaison" class="button button-secondary" style="font-weight:600;">
                Tester la connexion à l'ERP Django
            </button>
            <div id="resultat-test-api" style="margin-top:14px; display:none; padding:10px 14px; border-radius:6px; font-size:13px;"></div>
        </div>

        <form method="post" action="options.php" style="background:#fff; padding:24px; border:1px solid #cbd5e1; border-radius:10px; max-width:740px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
            <?php settings_fields('magnificat_options_group'); ?>
            <?php do_settings_sections('magnificat_options_group'); ?>

            <table class="form-table" style="margin-top:0;">
                <tr>
                    <th scope="row" style="width:260px;"><label for="magnificat_app_url"><strong>URL du Portail Scolaire (React)</strong></label></th>
                    <td>
                        <input type="url" id="magnificat_app_url" name="magnificat_app_url" value="<?php echo esc_attr($app_url); ?>" class="regular-text" style="width:100%;" required />
                        <p class="description">URL vers laquelle rediriger les utilisateurs lors du clic sur le bouton de connexion.<br>
                        En production : <code>https://app.magnificat-scolaire.tg/</code> ou <code>https://gestion-scolaire-magnificat-vcov.onrender.com/app/</code><br>
                        En test local : <code>http://127.0.0.1:8000/app/</code></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="magnificat_api_url"><strong>URL de l'API REST (Django)</strong></label></th>
                    <td>
                        <input type="url" id="magnificat_api_url" name="magnificat_api_url" value="<?php echo esc_attr($api_url); ?>" class="regular-text" style="width:100%;" required />
                        <p class="description">URL de l'API qui reçoit les demandes d'accès et sert les annonces publiques.<br>
                        En production : <code>https://gestion-scolaire-magnificat-vcov.onrender.com/api</code><br>
                        En test local : <code>http://127.0.0.1:8000/api</code></p>
                    </td>
                </tr>
            </table>

            <?php submit_button('Enregistrer les Modifications'); ?>
        </form>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:22px; max-width:740px; margin-top:25px;">
            <h3 style="margin-top:0; color:#0A2540;">Shortcodes Disponibles pour vos Pages & Widgets</h3>
            <table class="widefat striped" style="margin-top:12px;">
                <thead>
                    <tr>
                        <th style="width:30%;">Shortcode</th>
                        <th>Description et Utilisation</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>[magnificat_portail]</code></td>
                        <td>Affiche le bloc officiel d'accès au portail avec bouton de redirection vers la mire de connexion.</td>
                    </tr>
                    <tr>
                        <td><code>[magnificat_demande_acces]</code></td>
                        <td>Intègre le formulaire complet d'inscription en direct pour les futurs parents et enseignants.</td>
                    </tr>
                    <tr>
                        <td><code>[magnificat_annonces]</code></td>
                        <td>Affiche en direct le flux des annonces officielles publiées par l'administration sur l'ERP.</td>
                    </tr>
                    <tr>
                        <td><code>[magnificat_statistiques]</code></td>
                        <td>Affiche le bandeau institutionnel des indicateurs clés (cycles, certifications, réussite).</td>
                    </tr>
                    <tr>
                        <td><code>[magnificat_verifier_bulletin]</code></td>
                        <td>Formulaire de contrôle et d'authentification des bulletins certifiés par QR Code officiel.</td>
                    </tr>
                    <tr>
                        <td><code>[magnificat_agenda]</code></td>
                        <td>Affiche le calendrier académique officiel et les dates clés de l'année scolaire en direct.</td>
                    </tr>
                    <tr>
                        <td><code>[magnificat_site_vitrine]</code></td>
                        <td>Affiche l'intégralité du site vitrine institutionnel officiel plein écran clé-en-main.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
    document.getElementById('btn-tester-liaison').addEventListener('click', async function() {
        var resDiv = document.getElementById('resultat-test-api');
        var apiUrl = document.getElementById('magnificat_api_url').value.replace(/\/+$/, "");
        resDiv.style.display = 'block';
        resDiv.style.backgroundColor = '#EFF6FF';
        resDiv.style.color = '#1D4ED8';
        resDiv.style.border = '1px solid #BFDBFE';
        resDiv.innerText = "Interrogation de l'API en cours (" + apiUrl + ")...";

        var t0 = performance.now();
        try {
            var resp = await fetch(apiUrl + '/identite-publique/', { method: 'GET', headers: { 'Accept': 'application/json' } });
            var t1 = performance.now();
            var latence = Math.round(t1 - t0);

            if (resp.ok) {
                var json = await resp.json();
                resDiv.style.backgroundColor = '#F0FDF4';
                resDiv.style.color = '#166534';
                resDiv.style.border = '1px solid #86EFAC';
                resDiv.innerHTML = "<strong>Connexion active et opérationnelle !</strong><br>" +
                    "Établissement : " + (json.nom_ecole || "Complexe Magnificat") + " — " +
                    "Année scolaire : " + (json.annee_scolaire || "Active") + " — " +
                    "Temps de réponse : " + latence + " ms.";
            } else {
                resDiv.style.backgroundColor = '#FEF2F2';
                resDiv.style.color = '#991B1B';
                resDiv.style.border = '1px solid #FCA5A5';
                resDiv.innerText = "Erreur HTTP " + resp.status + " : le serveur a répondu mais a refusé la requête.";
            }
        } catch (err) {
            resDiv.style.backgroundColor = '#FEF2F2';
            resDiv.style.color = '#991B1B';
            resDiv.style.border = '1px solid #FCA5A5';
            resDiv.innerText = "Échec de connexion : impossible de joindre " + apiUrl + " (" + err.message + "). Vérifiez que le serveur Django est actif.";
        }
    });
    </script>
    <?php
}

/**
 * Shortcode 1 : Pavé d'accès au Portail Scolaire
 * Utilisation : [magnificat_portail]
 */
function magnificat_portail_shortcode($atts) {
    wp_enqueue_style('magnificat-connect-style');
    $app_url = get_option('magnificat_app_url', MAGNIFICAT_DEFAULT_APP_URL);

    ob_start();
    ?>
    <div class="mag-portail-widget">
        <div class="mag-portail-header">
            <div class="mag-badge-officiel">Système Intégré de Gestion Scolaire</div>
            <h3 class="mag-portail-titre">Portail Numérique Officiel</h3>
            <p class="mag-portail-desc">Accédez en toute sécurité à vos bulletins certifiés, au suivi des notes en temps réel, aux règlements scolaires par Mobile Money et à la messagerie interne.</p>
        </div>
        <div class="mag-portail-actions">
            <a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank" rel="noopener noreferrer" class="mag-btn-principal">
                Connexion à l'Espace École &rarr;
            </a>
            <a href="<?php echo esc_url($app_url . '#/demande-acces'); ?>" target="_blank" rel="noopener noreferrer" class="mag-btn-secondaire">
                Demander un accès
            </a>
        </div>
        <div class="mag-portail-profils">
            <span class="mag-profil-pill">Espace Direction</span>
            <span class="mag-profil-pill">Espace Enseignants</span>
            <span class="mag-profil-pill">Espace Parents</span>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('magnificat_portail', 'magnificat_portail_shortcode');

/**
 * Shortcode 2 : Formulaire de demande d'accès
 * Utilisation : [magnificat_demande_acces]
 */
function magnificat_demande_acces_shortcode($atts) {
    wp_enqueue_style('magnificat-connect-style');
    wp_enqueue_script('magnificat-connect-script');

    ob_start();
    ?>
    <div class="mag-form-conteneur">
        <div class="mag-form-entete">
            <h3>Demande d'Accès au Portail Scolaire</h3>
            <p>Ce formulaire est réservé aux parents d'élèves et enseignants du Complexe Scolaire Magnificat. Toute demande est soumise à validation administrative préalable.</p>
        </div>

        <form id="mag-formulaire-inscription" class="mag-form">
            <div class="mag-champ-groupe">
                <label for="mag_type_compte">Vous êtes :</label>
                <select id="mag_type_compte" name="type_compte" class="mag-input" required>
                    <option value="parent">Parent d'élève</option>
                    <option value="enseignant">Enseignant</option>
                </select>
            </div>

            <div class="mag-grille-2">
                <div class="mag-champ-groupe">
                    <label for="mag_nom">Nom de famille *</label>
                    <input type="text" id="mag_nom" name="last_name" class="mag-input" required minlength="2" placeholder="Ex: MENSAH" />
                </div>
                <div class="mag-champ-groupe">
                    <label for="mag_prenom">Prénom(s) *</label>
                    <input type="text" id="mag_prenom" name="first_name" class="mag-input" required minlength="2" placeholder="Ex: Afi Ama" />
                </div>
            </div>

            <div class="mag-grille-2">
                <div class="mag-champ-groupe">
                    <label for="mag_telephone">Numéro de téléphone (Togo) *</label>
                    <input type="tel" id="mag_telephone" name="telephone" class="mag-input" required placeholder="+228 90 00 00 00" />
                </div>
                <div class="mag-champ-groupe">
                    <label for="mag_email">Adresse courriel (optionnel)</label>
                    <input type="email" id="mag_email" name="email" class="mag-input" placeholder="exemple@domaine.tg" />
                </div>
            </div>

            <div class="mag-grille-2">
                <div class="mag-champ-groupe">
                    <label for="mag_username">Identifiant souhaité *</label>
                    <input type="text" id="mag_username" name="username_souhaite" class="mag-input" required minlength="3" placeholder="Ex: mensah_afi" />
                </div>
                <div class="mag-champ-groupe">
                    <label for="mag_password">Mot de passe secret *</label>
                    <input type="password" id="mag_password" name="password" class="mag-input" required minlength="8" placeholder="8 caractères minimum" />
                </div>
            </div>

            <div id="mag-bloc-parent" class="mag-champ-groupe">
                <label for="mag_profession">Profession (Parent)</label>
                <input type="text" id="mag_profession" name="profession" class="mag-input" placeholder="Ex: Commerçante, Fonctionnaire, Artisan..." />
            </div>

            <div id="mag-bloc-enseignant" class="mag-champ-groupe" style="display:none;">
                <label for="mag_specialite">Discipline / Spécialité (Enseignant)</label>
                <input type="text" id="mag_specialite" name="specialite" class="mag-input" placeholder="Ex: Mathématiques, Français, Sciences Physiques..." />
            </div>

            <div class="mag-actions-form">
                <button type="submit" id="mag-btn-envoyer" class="mag-btn-principal">
                    Transmettre ma Demande au Secrétariat
                </button>
            </div>

            <div id="mag-message-statut" class="mag-alerte" style="display:none;"></div>
        </form>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('magnificat_demande_acces', 'magnificat_demande_acces_shortcode');

/**
 * Shortcode 3 : Flux des Annonces Officielles en direct
 * Utilisation : [magnificat_annonces]
 */
function magnificat_annonces_shortcode($atts) {
    wp_enqueue_style('magnificat-connect-style');
    wp_enqueue_script('magnificat-connect-script');

    ob_start();
    ?>
    <div class="mag-annonces-conteneur">
        <div class="mag-annonces-entete">
            <h3>Communiqués & Annonces Officielles</h3>
            <p>Flux en direct synchronisé avec la Direction de l'établissement.</p>
        </div>
        <div id="mag-annonces-liste" class="mag-annonces-grille">
            <div class="mag-chargement">Chargement des annonces en cours...</div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('magnificat_annonces', 'magnificat_annonces_shortcode');

/**
 * Shortcode 4 : Indicateurs Clés de l'Établissement
 * Utilisation : [magnificat_statistiques]
 */
function magnificat_statistiques_shortcode($atts) {
    wp_enqueue_style('magnificat-connect-style');
    wp_enqueue_script('magnificat-connect-script');

    ob_start();
    ?>
    <div class="mag-stats-bandeau" id="mag-bandeau-statistiques">
        <div class="mag-stat-col">
            <div class="mag-stat-chiffre" id="mag-stat-eleves">18</div>
            <div class="mag-stat-libelle">Élèves Inscrits</div>
        </div>
        <div class="mag-stat-col">
            <div class="mag-stat-chiffre" id="mag-stat-classes">3</div>
            <div class="mag-stat-libelle">Divisions Pédagogiques</div>
        </div>
        <div class="mag-stat-col">
            <div class="mag-stat-chiffre" id="mag-stat-profs">4</div>
            <div class="mag-stat-libelle">Enseignants Qualifiés</div>
        </div>
        <div class="mag-stat-col">
            <div class="mag-stat-chiffre" id="mag-stat-reussite">98.5%</div>
            <div class="mag-stat-libelle">Taux de Réussite Académique</div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('magnificat_statistiques', 'magnificat_statistiques_shortcode');

/**
 * Shortcode 5 : Vérificateur public de Bulletin Certifié In Situ (AJAX)
 * Utilisation : [magnificat_verifier_bulletin]
 */
function magnificat_verifier_bulletin_shortcode($atts) {
    wp_enqueue_style('magnificat-connect-style');
    wp_enqueue_script('magnificat-connect-script');
    $api_url = get_option('magnificat_api_url', MAGNIFICAT_DEFAULT_API_URL);
    $racine_serveur = preg_replace('#/api/?$#', '', $api_url);

    ob_start();
    ?>
    <div class="mag-verifier-widget">
        <span class="mag-badge-officiel" style="margin-bottom:8px;">Contrôle Documentaire Officiel</span>
        <h4>Vérification d'Authenticité d'un Bulletin Officiel</h4>
        <p>Saisissez le numéro d'identification unique figurant sous le QR Code officiel du bulletin pour attester de sa conformité en direct.</p>
        <form id="mag-form-verifier-bulletin" style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px;">
            <input type="number" id="mag_id_bulletin" class="mag-input" placeholder="Exemple : 1" style="max-width:180px;" required />
            <button type="submit" id="mag-btn-verifier" class="mag-btn-principal">Vérifier l'Authenticité</button>
        </form>
        <div style="font-size:12px; color:#94A3B8; margin-top:8px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span>Exemples rapides :</span>
            <button type="button" onclick="document.getElementById('mag_id_bulletin').value='1'; document.getElementById('mag-form-verifier-bulletin').dispatchEvent(new Event('submit'));" class="mag-badge" style="background:#DCFCE7; color:#15803D; border:1px solid #86EFAC; cursor:pointer; font-weight:700;">
                ✓ Bulletin #1 (Afi MENSAH - 3e A)
            </button>
            <button type="button" onclick="document.getElementById('mag_id_bulletin').value='2'; document.getElementById('mag-form-verifier-bulletin').dispatchEvent(new Event('submit'));" class="mag-badge" style="background:#E0E7FF; color:#3730A3; border:1px solid #A5B4FC; cursor:pointer; font-weight:700;">
                ✓ Bulletin #2 (Koffi AGBEVI)
            </button>
        </div>
        <!-- Conteneur dynamique de réponse AJAX in situ -->
        <div id="mag-resultat-verification" style="display:none; margin-top:16px;"></div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('magnificat_verifier_bulletin', 'magnificat_verifier_bulletin_shortcode');

/**
 * Shortcode 6 : Agenda et Calendrier Scolaire Officiel
 * Utilisation : [magnificat_agenda] ou [magnificat_calendrier]
 */
function magnificat_agenda_shortcode($atts) {
    wp_enqueue_style('magnificat-connect-style');
    wp_enqueue_script('magnificat-connect-script');

    ob_start();
    ?>
    <div class="mag-agenda-conteneur" id="agenda-scolaire">
        <div class="mag-agenda-entete">
            <span class="mag-badge-officiel">Calendrier Académique</span>
            <h3>Agenda & Événements Scolaires Officiels</h3>
            <p>Dates officielles arrêtées pour l'année scolaire en cours (compositions, rentrées et congés nationaux).</p>
        </div>
        <div id="mag-agenda-liste" class="mag-agenda-grille">
            <div class="mag-chargement">Chargement de l'agenda officiel en direct...</div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('magnificat_agenda', 'magnificat_agenda_shortcode');
add_shortcode('magnificat_calendrier', 'magnificat_agenda_shortcode');

/**
 * Shortcode 6 : Site Vitrine Complet Clé-en-main Ultra-Pro
 * Utilisation : [magnificat_site_vitrine]
 * Affiche l'intégralité du site vitrine institutionnel plein écran avec en-tête, hero banner, cycles, portail, admissions, annonces et pied de page.
 */
function magnificat_site_vitrine_shortcode($atts) {
    wp_enqueue_style('magnificat-connect-style');
    wp_enqueue_script('magnificat-connect-script');

    $api_url = get_option('magnificat_api_url', MAGNIFICAT_DEFAULT_API_URL);
    $app_url = get_option('magnificat_app_url', MAGNIFICAT_DEFAULT_APP_URL);
    $racine_serveur = preg_replace('#/api/?$#', '', $api_url);

    ob_start();
    ?>
    <div class="mag-site-vitrine-full">
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
                    <span class="mag-annee">Année Académique 2026-2027</span>
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
                    <a href="#mag-section-cycles" class="mag-nav-link">Cycles d'Études</a>
                    <a href="#mag-section-portail" class="mag-nav-link">Espace Numérique</a>
                    <a href="#mag-section-admissions" class="mag-nav-link">Admissions</a>
                    <a href="#mag-section-annonces" class="mag-nav-link">Communiqués</a>
                    <a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank" rel="noopener noreferrer" class="mag-btn-header">
                        <span>Connexion École</span>
                        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>
                    </a>
                </nav>
            </div>
        </header>

        <!-- 3. Bannière Héroïque Institutionnelle -->
        <section class="mag-hero">
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
                    <a href="#mag-section-admissions" class="mag-hero-btn-secondary">
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

        <!-- 4. Section Cycles d'Enseignement -->
        <section class="mag-section" id="mag-section-cycles">
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
        <section class="mag-section mag-section-alt" id="mag-section-portail">
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
                        <p>Consultation instantanée des moyennes, classements et téléchargement des bulletins certifiés au format PDF.</p>
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
        <section class="mag-section" id="mag-section-admissions">
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
        <section class="mag-section mag-section-alt" id="mag-section-annonces">
            <div class="mag-conteneur">
                <div class="mag-grille-2cols">
                    <div>
                        <?php echo magnificat_annonces_shortcode(array()); ?>
                    </div>
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
                            <li><a href="#mag-section-cycles">Cycles d'Enseignement</a></li>
                            <li><a href="#mag-section-portail">Portail Scolaire ERP</a></li>
                            <li><a href="#mag-section-admissions">Admissions & Tarifs</a></li>
                            <li><a href="#mag-section-annonces">Communiqués Officiels</a></li>
                        </ul>
                    </div>

                    <div class="mag-footer-col">
                        <h4>Accès Rapide</h4>
                        <ul class="mag-footer-liens">
                            <li><a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank">Espace Enseignants</a></li>
                            <li><a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank">Espace Parents</a></li>
                            <li><a href="<?php echo esc_url($app_url . '#/connexion'); ?>" target="_blank">Espace Administration</a></li>
                            <li><a href="#mag-section-annonces">Vérification QR Code</a></li>
                        </ul>
                    </div>

                    <div class="mag-footer-col">
                        <h4>Contact Officiel</h4>
                        <p class="mag-footer-contact">
                            <strong>Localisation :</strong><br />
                            Quartier Adidogomé-Cacaveli<br />
                            Lomé, République Togolaise
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
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('magnificat_site_vitrine', 'magnificat_site_vitrine_shortcode');
add_shortcode('magnificat_accueil', 'magnificat_site_vitrine_shortcode');

/**
 * Modèle de page pleine largeur officiel pour WordPress
 */
function magnificat_register_page_templates($templates) {
    $templates['magnificat-site-vitrine.php'] = 'Site Vitrine Officiel - Complexe Scolaire Magnificat';
    return $templates;
}
add_filter('theme_page_templates', 'magnificat_register_page_templates');

function magnificat_load_page_templates($template) {
    global $post;
    if (!$post) return $template;
    $custom_template = get_post_meta($post->ID, '_wp_page_template', true);
    if ($custom_template === 'magnificat-site-vitrine.php') {
        $file = MAGNIFICAT_CONNECT_DIR . 'templates/page-site-vitrine.php';
        if (file_exists($file)) {
            return $file;
        }
    }
    return $template;
}
add_filter('template_include', 'magnificat_load_page_templates');
