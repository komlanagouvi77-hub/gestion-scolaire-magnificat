<?php
/**
 * Plugin Name: Magnificat Connect — Passerelle Scolaire Officielle
 * Plugin URI: https://magnificat-scolaire.tg
 * Description: Connecte votre site vitrine WordPress au Système Intégré de Gestion Scolaire (ERP Django / React) du Complexe Scolaire Magnificat.
 * Version: 1.0.0
 * Author: Georges AGOUVI
 * Author URI: https://magnificat-scolaire.tg
 * Text Domain: magnificat-connect
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) {
    exit; // Sécurité : interdire l'accès direct
}

define('MAGNIFICAT_CONNECT_VERSION', '1.0.0');
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
        'magnificat-connect-style',
        MAGNIFICAT_CONNECT_URL . 'css/magnificat-connect.css',
        array(),
        MAGNIFICAT_CONNECT_VERSION
    );

    wp_register_script(
        'magnificat-connect-script',
        MAGNIFICAT_CONNECT_URL . 'js/magnificat-connect.js',
        array(),
        MAGNIFICAT_CONNECT_VERSION,
        true
    );

    // Transmission des paramètres configurés au script JavaScript
    $api_url = get_option('magnificat_api_url', MAGNIFICAT_DEFAULT_API_URL);
    $app_url = get_option('magnificat_app_url', MAGNIFICAT_DEFAULT_APP_URL);

    wp_localize_script('magnificat-connect-script', 'magnificatConfig', array(
        'apiUrl' => esc_url_raw(rtrim($api_url, '/')),
        'appUrl' => esc_url_raw(rtrim($app_url, '/')),
    ));
}
add_action('wp_enqueue_scripts', 'magnificat_connect_scripts');

/**
 * Page de configuration dans l'administration WordPress (Réglages > Magnificat Connect)
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
    ?>
    <div class="wrap">
        <h1>Configuration de la Passerelle Magnificat Connect</h1>
        <p>Ce module connecte votre site vitrine WordPress au moteur de gestion scolaire Django / React du Complexe Scolaire Magnificat.</p>

        <form method="post" action="options.php" style="background:#fff; padding:20px; border:1px solid #ccd0d4; border-radius:8px; max-width:700px; margin-top:20px;">
            <?php settings_fields('magnificat_options_group'); ?>
            <?php do_settings_sections('magnificat_options_group'); ?>

            <table class="form-table">
                <tr>
                    <th scope="row"><label for="magnificat_app_url">URL de l'Application Scolaire (React)</label></th>
                    <td>
                        <input type="url" id="magnificat_app_url" name="magnificat_app_url" value="<?php echo esc_attr(get_option('magnificat_app_url', MAGNIFICAT_DEFAULT_APP_URL)); ?>" class="regular-text" style="width:100%;" />
                        <p class="description">Exemple : <code>https://app.magnificat-scolaire.tg/</code> ou <code>https://gestion-scolaire-magnificat-vcov.onrender.com/app/</code></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="magnificat_api_url">URL de l'API REST (Django)</label></th>
                    <td>
                        <input type="url" id="magnificat_api_url" name="magnificat_api_url" value="<?php echo esc_attr(get_option('magnificat_api_url', MAGNIFICAT_DEFAULT_API_URL)); ?>" class="regular-text" style="width:100%;" />
                        <p class="description">Exemple : <code>https://app.magnificat-scolaire.tg/api</code> ou <code>https://gestion-scolaire-magnificat-vcov.onrender.com/api</code></p>
                    </td>
                </tr>
            </table>

            <?php submit_button('Enregistrer les Réglages'); ?>
        </form>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:20px; max-width:700px; margin-top:25px;">
            <h2 style="margin-top:0;">Shortcodes Disponibles pour vos Pages WordPress</h2>
            <ul style="line-height:1.8;">
                <li><code>[magnificat_portail]</code> : Affiche le pavé institutionnel d'accès au portail avec bouton de connexion directe.</li>
                <li><code>[magnificat_demande_acces]</code> : Intègre le formulaire sécurisé de demande d'inscription (transmis en direct à l'API Django).</li>
                <li><code>[magnificat_annonces]</code> : Affiche les dernières annonces administratives publiées sur l'ERP.</li>
            </ul>
        </div>
    </div>
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
            <p class="mag-portail-desc">Accédez en toute sécurité à vos bulletins certifiés, au suivi des notes, au relevé financier et à la messagerie interne.</p>
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
            <p>Ce formulaire est réservé aux parents d'élèves et enseignants du Complexe Scolaire Magnificat. Toute demande est soumise à validation administrative.</p>
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
