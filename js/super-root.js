let superRootProfiles = [];

const TEAM_ROLES = ['agent_commercial', 'admin', 'super_root', 'livreur'];

const TEAM_ROLE_LABELS = {
  agent_commercial: 'Agent commercial',
  admin: 'Admin',
  super_root: 'Super root',
  livreur: 'Livreur'
};

function isTeamProfile(profile) {
  if (!profile) return false;
  if (['client', 'supplier', 'pending_company'].includes(profile.role)) return false;
  return TEAM_ROLES.includes(profile.role);
}

function personLabel(profile) {
  return profile?.full_name || profile?.email || 'Utilisateur';
}

function toggleInternalVehicleField(role) {
  const wrap = document.getElementById('internalVehicleWrap');
  if (!wrap) return;
  wrap.hidden = role !== 'livreur';
}

async function applyTeamRoleChange(profileId, newRole) {
  const profile = superRootProfiles.find((p) => p.id === profileId);
  if (!profile) throw new Error('Profil introuvable.');

  if (newRole === 'livreur') {
    if (profile.driver_id) {
      await updateProfileAsSuperRoot(profileId, {
        role: 'livreur',
        company: 'Livreur HB Commerce'
      });
      return;
    }
    const driver = await createDeliveryDriver({
      full_name: profile.full_name || profile.email || 'Livreur',
      email: profile.email || '',
      phone: profile.phone || '',
      vehicle_info: '',
      active: true
    });
    await updateProfileAsSuperRoot(profileId, {
      role: 'livreur',
      driver_id: driver.id,
      company: 'Livreur HB Commerce'
    });
    return;
  }

  const fields = { role: newRole, company: 'HB Commerce' };
  if (profile.role === 'livreur') fields.driver_id = null;
  await updateProfileAsSuperRoot(profileId, fields);
}

function showSuperRootSection(sectionId) {
  const panel = document.getElementById('superRootPanel');
  if (!panel || !sectionId) return;
  panel.querySelectorAll('#superRootTabs .admin-tab[data-section]').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.section === sectionId);
  });
  panel.querySelectorAll('[data-section-panel]').forEach((section) => {
    section.hidden = section.dataset.sectionPanel !== sectionId;
  });
}

function bindSuperRootTabs() {
  const panel = document.getElementById('superRootPanel');
  if (!panel || panel.dataset.tabsBound === '1') return;
  panel.dataset.tabsBound = '1';
  panel.querySelectorAll('#superRootTabs .admin-tab[data-section]').forEach((tab) => {
    tab.addEventListener('click', () => showSuperRootSection(tab.dataset.section));
  });
}

async function initSuperRoot() {
  const session = await requireSuperRoot();
  if (!session) return;

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  document.getElementById('refreshProfilesBtn')?.addEventListener('click', loadSuperRootData);
  document.getElementById('newProfileBtn')?.addEventListener('click', () => showSuperRootSection('nouveau'));
  document.getElementById('superRootInfoBtn')?.addEventListener('click', () => openAppModal('superRootInfoModal'));
  document.getElementById('internalUserForm')?.addEventListener('submit', handleInternalUserSubmit);
  document.getElementById('profileEditForm')?.addEventListener('submit', handleProfileEditSubmit);
  document.getElementById('resetProfileEditBtn')?.addEventListener('click', resetProfileEditForm);
  document.getElementById('internalRoleSelect')?.addEventListener('change', (e) => {
    toggleInternalVehicleField(e.target.value);
  });
  bindAppModal('superRootInfoModal');
  bindAppModal('profileEditModal');
  bindSuperRootTabs();
  toggleInternalVehicleField(document.getElementById('internalRoleSelect')?.value || 'agent_commercial');
  showSuperRootSection('equipe');
  await loadSuperRootData();
}

async function loadSuperRootData() {
  try {
    superRootProfiles = typeof fetchInternalProfiles === 'function'
      ? await fetchInternalProfiles()
      : (await fetchAllProfiles()).filter(isTeamProfile);
    renderProfilesTable();
  } catch (err) {
    showAlert(document.getElementById('profilesNote'), err.message);
  }
}

function renderProfilesTable() {
  const body = document.getElementById('profilesBody');
  if (!body) return;

  body.innerHTML = superRootProfiles.length ? superRootProfiles.map((profile) => `
    <tr>
      <td><strong>${escapeHtml(personLabel(profile))}</strong></td>
      <td>${escapeHtml(profile.email || '—')}</td>
      <td>${escapeHtml(profile.phone || '—')}</td>
      <td>
        <select data-role-profile="${profile.id}">
          ${TEAM_ROLES.map((role) => `
            <option value="${role}" ${profile.role === role ? 'selected' : ''}>${TEAM_ROLE_LABELS[role]}</option>
          `).join('')}
        </select>
      </td>
      <td><button type="button" class="btn btn-sm btn-outline-dark" data-edit-profile="${profile.id}">Modifier</button></td>
    </tr>
  `).join('') : '<tr><td colspan="5">Aucun utilisateur HB Commerce.</td></tr>';

  body.querySelectorAll('[data-edit-profile]').forEach((btn) => {
    btn.addEventListener('click', () => editProfile(btn.dataset.editProfile));
  });

  body.querySelectorAll('[data-role-profile]').forEach((select) => {
    select.addEventListener('change', async () => {
      const note = document.getElementById('profilesNote');
      const newRole = select.value;
      if (!TEAM_ROLES.includes(newRole)) {
        showAlert(note, 'Rôle non autorisé.');
        await loadSuperRootData();
        return;
      }
      try {
        await applyTeamRoleChange(select.dataset.roleProfile, newRole);
        showAlert(note, 'Rôle mis à jour.', 'success');
        await loadSuperRootData();
      } catch (err) {
        showAlert(note, err.message);
        await loadSuperRootData();
      }
    });
  });
}

function resetProfileEditForm() {
  const form = document.getElementById('profileEditForm');
  if (!form) return;
  form.reset();
  form.elements.id.value = '';
  document.getElementById('profileEditTitle').textContent = 'Modifier un utilisateur HB Commerce';
  showAlert(document.getElementById('profileEditNote'), '');
}

async function handleInternalUserSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('internalUserNote');
  const fd = new FormData(e.target);
  const role = fd.get('internal_role');
  try {
    if (role === 'livreur') {
      const driver = await createDeliveryDriver({
        full_name: fd.get('full_name'),
        email: fd.get('email'),
        phone: fd.get('phone') || '',
        vehicle_info: fd.get('vehicle_info') || '',
        active: true
      });
      await createDriverUser({
        driverId: driver.id,
        email: fd.get('email'),
        password: fd.get('password'),
        fullName: fd.get('full_name'),
        phone: fd.get('phone'),
        vehicleInfo: fd.get('vehicle_info')
      });
      showAlert(note, 'Livreur créé. Connexion : login-livreur.html ou login.html', 'success');
    } else {
      await createInternalUser({
        email: fd.get('email'),
        password: fd.get('password'),
        fullName: fd.get('full_name'),
        phone: fd.get('phone'),
        role
      });
      showAlert(note, 'Utilisateur HB Commerce créé.', 'success');
    }
    e.target.reset();
    toggleInternalVehicleField('agent_commercial');
    showSuperRootSection('equipe');
    await loadSuperRootData();
  } catch (err) {
    showAlert(note, mapAuthError(err));
  }
}

function editProfile(profileId) {
  const profile = superRootProfiles.find((p) => p.id === profileId);
  const form = document.getElementById('profileEditForm');
  if (!profile || !form) return;

  form.elements.id.value = profile.id;
  form.elements.full_name.value = profile.full_name || '';
  form.elements.email.value = profile.email || '';
  form.elements.phone.value = profile.phone || '';
  form.elements.role.value = profile.role || 'agent_commercial';
  document.getElementById('profileEditTitle').textContent = `Modifier ${personLabel(profile)}`;
  showAlert(document.getElementById('profileEditNote'), '');
  openAppModal('profileEditModal');
}

async function handleProfileEditSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('profileEditNote');
  const fd = new FormData(e.target);
  const profileId = fd.get('id');
  if (!profileId) {
    showAlert(note, 'Sélectionnez un utilisateur à modifier.');
    return;
  }

  const role = fd.get('role');
  if (!TEAM_ROLES.includes(role)) {
    showAlert(note, 'Rôle non autorisé.');
    return;
  }

  const profile = superRootProfiles.find((p) => p.id === profileId);

  try {
    await updateProfileAsSuperRoot(profileId, {
      full_name: fd.get('full_name') || '',
      email: fd.get('email') || '',
      phone: fd.get('phone') || ''
    });
    if (profile && profile.role !== role) {
      await applyTeamRoleChange(profileId, role);
    }
    showAlert(note, 'Utilisateur mis à jour.', 'success');
    resetProfileEditForm();
    closeAppModal('profileEditModal');
    showSuperRootSection('equipe');
    await loadSuperRootData();
  } catch (err) {
    showAlert(note, err.message);
  }
}

document.addEventListener('DOMContentLoaded', initSuperRoot);
