/**
 * Bascule mode clair / sombre — page d'accueil HB Commerce
 */
const HB_SITE_THEME_KEY = 'hb_site_theme';

function updateSiteThemeToggleBtn() {
  const btn = document.getElementById('siteThemeToggleBtn');
  if (!btn) return;
  const isLight = document.documentElement.classList.contains('site-theme-light');
  btn.textContent = isLight ? '🌙' : '☀️';
  btn.setAttribute('aria-label', isLight ? 'Passer en mode sombre' : 'Passer en mode clair');
  btn.title = isLight ? 'Mode sombre' : 'Mode clair';
}

function applySiteTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.classList.toggle('site-theme-light', isLight);
  document.documentElement.classList.toggle('site-theme-dark', !isLight);
  try {
    localStorage.setItem(HB_SITE_THEME_KEY, isLight ? 'light' : 'dark');
  } catch { /* ignore */ }
  updateSiteThemeToggleBtn();
}

function initSiteThemeToggle() {
  updateSiteThemeToggleBtn();
  document.getElementById('siteThemeToggleBtn')?.addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('site-theme-light');
    applySiteTheme(isLight ? 'dark' : 'light');
  });
}

document.addEventListener('DOMContentLoaded', initSiteThemeToggle);
