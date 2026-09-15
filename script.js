/* ============================================
   TEMPLATE SITE-VIE EPC - LOGIQUE JAVASCRIPT
   Version 1.0.0 - Bootstrap 5.3.3
   Fonctionne avec ou sans base de données
   ============================================ */

'use strict';

// ============================================
// ÉTAT GLOBAL DE L'APPLICATION
// ============================================
const APP = {
  config: null,
  modules: {},
  fidele: {},
  langue: 'fr',
  traductions: {},
  donnees: {},
  modeDB: false, // true si Supabase activé
};

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 Initialisation du Site-Vie EPC...');
    
    // 1. Charger la configuration principale
    await chargerConfig();
    
    // 2. Déterminer la langue (URL ou navigateur ou défaut)
    APP.langue = determinerLangue();
    document.documentElement.lang = APP.langue;
    
    // 3. Charger les traductions
    await chargerTraductions();
    
    // 4. Charger toutes les données
    await chargerToutesDonnees();
    
    // 5. Appliquer la configuration (titre, meta, etc.)
    appliquerConfig();
    
    // 6. Générer la navigation
    genererNavigation();
    
    // 7. Afficher/masquer les modules activés
    activerModules();
    
    // 8. Charger le contenu de chaque module
    await chargerContenusModules();
    
    // 9. Configurer les interactions (scroll, formulaire, partage)
    configurerInteractions();
    
    // 10. Masquer l'overlay de chargement
    masquerChargement();
    
    console.log('✅ Site-Vie prêt !');
  } catch (erreur) {
    console.error('❌ Erreur d\'initialisation:', erreur);
    afficherErreur('Une erreur est survenue lors du chargement du site.');
  }
});

// ============================================
// 1. CHARGEMENT DE LA CONFIGURATION
// ============================================
async function chargerConfig() {
  try {
    const reponse = await fetch('config/config.json');
    if (!reponse.ok) throw new Error('config.json introuvable');
    APP.config = await reponse.json();
    APP.fidele = APP.config.fidele || {};
    APP.modules = APP.config.modules || {};
    
    console.log('📋 Configuration chargée:', APP.fidele.nomComplet);
  } catch (erreur) {
    console.error('Erreur config.json:', erreur);
    // Configuration par défaut
    APP.config = {
      fidele: { nomComplet: 'Fidèle EPC', statut: 'vivant' },
      modules: {},
      langues: { parDefaut: 'fr', disponibles: ['fr', 'en'] }
    };
    APP.fidele = APP.config.fidele;
    APP.modules = APP.config.modules;
  }
}

// ============================================
// 2. DÉTERMINER LA LANGUE
// ============================================
function determinerLangue() {
  // Priorité : 1. URL (?lang=en)  2. localStorage  3. Navigateur  4. Défaut
  const params = new URLSearchParams(window.location.search);
  const langUrl = params.get('lang');
  if (langUrl) return langUrl;
  
  const langStockee = localStorage.getItem('epc-langue');
  if (langStockee) return langStockee;
  
  const langNavigateur = navigator.language?.slice(0, 2);
  if (langNavigateur && (APP.config?.langues?.disponibles || ['fr', 'en']).includes(langNavigateur)) {
    return langNavigateur;
  }
  
  return APP.config?.langues?.parDefaut || 'fr';
}

// ============================================
// 3. CHARGER LES TRADUCTIONS
// ============================================
async function chargerTraductions() {
  try {
    const reponse = await fetch(`i18n/${APP.langue}.json`);
    if (!reponse.ok) throw new Error(`i18n/${APP.langue}.json introuvable`);
    APP.traductions = await reponse.json();
  } catch (erreur) {
    console.warn(`Traductions ${APP.langue} indisponibles, fallback français`);
    try {
      const reponse = await fetch('i18n/fr.json');
      APP.traductions = await reponse.json();
    } catch {
      APP.traductions = {};
    }
  }
}

// ============================================
// 4. CHARGER TOUTES LES DONNÉES
// ============================================
async function chargerToutesDonnees() {
  const fichiers = [
    'biographie', 'galerie', 'videos', 'audios',
    'temoignages', 'activites', 'sacrements',
    'publications', 'telechargements',
    'programme_obseques', 'condoleances', 'hommages',
    'arbre_genealogique', 'faq'
  ];
  
  const promesses = fichiers.map(async (nom) => {
    try {
      const reponse = await fetch(`data/${nom}.json`);
      if (reponse.ok) {
        APP.donnees[nom] = await reponse.json();
      } else {
        APP.donnees[nom] = null;
      }
    } catch {
      APP.donnees[nom] = null;
    }
  });
  
  await Promise.all(promesses);
  console.log('📦 Données chargées:', Object.keys(APP.donnees).filter(k => APP.donnees[k]).length, 'modules');
}

// ============================================
// 5. APPLIQUER LA CONFIGURATION
// ============================================
function appliquerConfig() {
  const fid = APP.fidele;
  const statut = fid.statut || 'vivant';
  const estMemoire = statut === 'memoire';
  
  // Titre de la page
  const titrePrefix = estMemoire ? '🕯️ En mémoire de' : '';
  document.title = `${titrePrefix} ${fid.nomComplet || 'Fidèle EPC'} - Site-Vie EPC`;
  
  // Meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = estMemoire
      ? `Site de mémoire en hommage à ${fid.nomComplet}`
      : `Site-Vie de ${fid.nomComplet}, fidèle de la paroisse ${fid.paroisse || 'EPC'}`;
  }
  
  // Body class pour mode mémoire
  if (estMemoire) {
    document.body.classList.add('mode-memoire');
    afficherBanniereMemoire();
  }
  
  // Hero : nom + dates + verset
  const heroName = document.getElementById('hero-name');
  if (heroName) heroName.textContent = fid.nomComplet || 'Fidèle EPC';
  
  const heroDates = document.getElementById('hero-dates');
  if (heroDates) {
    const naissance = formaterDate(fid.naissance);
    const deces = estMemoire ? formaterDate(fid.deces) : null;
    heroDates.textContent = deces ? `${naissance} — ${deces}` : `Né(e) le ${naissance}`;
  }
  
  const heroVerset = document.getElementById('hero-verset');
  if (heroVerset && fid.verset) {
    heroVerset.textContent = `« ${fid.verset} »`;
  }
  
  // Photo de fond (si définie)
  if (fid.photoBanniere) {
    const hero = document.getElementById('hero');
    if (hero) {
      hero.style.backgroundImage = `
        linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.55)),
        url('${fid.photoBanniere}')
      `;
    }
  }
  
  // Footer
  const footerName = document.getElementById('footer-name');
  if (footerName) footerName.textContent = fid.nomComplet || 'Fidèle EPC';
  
  const footerParoisse = document.getElementById('footer-paroisse');
  if (footerParoisse) footerParoisse.textContent = `Paroisse ${fid.paroisse || 'EPC'}`;
  
  const footerDates = document.getElementById('footer-dates');
  if (footerDates) {
    const naissance = formaterDate(fid.naissance);
    const deces = estMemoire ? ` — ${formaterDate(fid.deces)}` : '';
    footerDates.textContent = `${naissance}${deces}`;
  }
  
  const footerYear = document.getElementById('footer-year');
  if (footerYear) footerYear.textContent = new Date().getFullYear();
  
  const footerVersion = document.getElementById('footer-version');
  if (footerVersion) footerVersion.textContent = APP.config.meta?.version || '1
