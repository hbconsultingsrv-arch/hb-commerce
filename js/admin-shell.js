/**
 * Shell admin — sidebar, mode sombre, navigation
 */

function initAdminShell() {
  const sidebar = document.getElementById('adminSidebar');
  const toggle = document.getElementById('adminSidebarToggle');
  const darkBtn = document.getElementById('adminDarkModeBtn');

  function setSidebarOpen(open) {
    sidebar?.classList.toggle('is-open', open);
    document.body.classList.toggle('admin-nav-open', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation');
    }
  }

  toggle?.addEventListener('click', () => {
    setSidebarOpen(!sidebar?.classList.contains('is-open'));
  });
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 768) return;
    if (!sidebar?.classList.contains('is-open')) return;
    if (e.target.closest('.admin-sidebar') || e.target.closest('#adminSidebarToggle')) return;
    setSidebarOpen(false);
  });

  const savedDark = localStorage.getItem('hb_admin_dark') === '1';
  if (savedDark) document.body.classList.add('admin-dark');
  darkBtn?.addEventListener('click', () => {
    document.body.classList.toggle('admin-dark');
    localStorage.setItem('hb_admin_dark', document.body.classList.contains('admin-dark') ? '1' : '0');
    darkBtn.textContent = document.body.classList.contains('admin-dark') ? '☀️ Clair' : '🌙 Sombre';
  });
  if (darkBtn) {
    darkBtn.textContent = document.body.classList.contains('admin-dark') ? '☀️ Clair' : '🌙 Sombre';
  }

  document.querySelectorAll('.admin-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      showAdminTab(btn.dataset.tab);
      setSidebarOpen(false);
    });
  });
}

async function updateAdminNavBadges() {
  try {
    const messages = await fetchChatMessages();
    const pending = messages.filter((m) => m.status === 'pending' && m.author_role === 'client').length;
    const badge = document.getElementById('adminChatNavBadge');
    if (badge) {
      badge.textContent = pending || '';
      badge.hidden = !pending;
    }
  } catch { /* ignore */ }
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminShell();
  updateAdminNavBadges();
});

window.initAdminShell = initAdminShell;
window.updateAdminNavBadges = updateAdminNavBadges;
