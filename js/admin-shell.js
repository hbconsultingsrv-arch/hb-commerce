/**
 * Shell admin — sidebar, mode sombre, navigation
 */

function initAdminShell() {
  const sidebar = document.getElementById('adminSidebar');
  const toggle = document.getElementById('adminSidebarToggle');
  const darkBtn = document.getElementById('adminDarkModeBtn');

  toggle?.addEventListener('click', () => sidebar?.classList.toggle('is-open'));
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 768) return;
    if (!sidebar?.classList.contains('is-open')) return;
    if (e.target.closest('.admin-sidebar') || e.target.closest('#adminSidebarToggle')) return;
    sidebar.classList.remove('is-open');
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
      sidebar?.classList.remove('is-open');
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
