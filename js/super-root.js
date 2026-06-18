let superRootProfiles = [];
let superRootProducts = [];
let superRootPrices = [];

async function initSuperRoot() {
  const session = await requireSuperRoot();
  if (!session) return;

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.hidden = true);
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
    });
  });

  document.getElementById('refreshProfilesBtn')?.addEventListener('click', loadSuperRootData);
  document.getElementById('customerPriceForm')?.addEventListener('submit', handleCustomerPriceSubmit);
  document.getElementById('profileCreateForm')?.addEventListener('submit', handleProfileCreateSubmit);
  document.getElementById('profileEditForm')?.addEventListener('submit', handleProfileEditSubmit);
  document.getElementById('resetProfileEditBtn')?.addEventListener('click', resetProfileEditForm);
  await loadSuperRootData();
}

function profileLabel(profile) {
  return profile?.company || profile?.full_name || profile?.email || 'Société';
}

function productLabel(product) {
  return product?.name || product?.slug || 'Produit';
}

async function loadSuperRootData() {
  try {
    superRootProfiles = await fetchAllProfiles();
    superRootProducts = await fetchAllProducts();
    if (!superRootProducts.length && typeof buildFiafiCatalog === 'function') {
      superRootProducts = buildFiafiCatalog();
    }
    superRootPrices = await fetchCustomerPrices();

    renderProfilesTable();
    renderPriceSelectors();
    renderCustomerPricesTable();
  } catch (err) {
    showAlert(document.getElementById('profilesNote'), err.message);
    showAlert(document.getElementById('customerPriceNote'), err.message);
  }
}

function renderProfilesTable() {
  const body = document.getElementById('profilesBody');
  if (!body) return;

  body.innerHTML = superRootProfiles.map((profile) => `
    <tr>
      <td><strong>${escapeHtml(profile.company || '—')}</strong></td>
      <td>${escapeHtml(profile.full_name || '—')}</td>
      <td>${escapeHtml(profile.email || '—')}</td>
      <td>
        <select data-role-profile="${profile.id}">
          ${['client', 'admin', 'super_root'].map((role) => `
            <option value="${role}" ${profile.role === role ? 'selected' : ''}>${role}</option>
          `).join('')}
        </select>
      </td>
      <td><button type="button" class="btn btn-sm btn-outline-dark" data-edit-profile="${profile.id}">Modifier</button></td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-edit-profile]').forEach((btn) => {
    btn.addEventListener('click', () => editProfile(btn.dataset.editProfile));
  });

  body.querySelectorAll('[data-role-profile]').forEach((select) => {
    select.addEventListener('change', async () => {
      const note = document.getElementById('profilesNote');
      try {
        await updateProfileRole(select.dataset.roleProfile, select.value);
        showAlert(note, 'Rôle mis à jour.', 'success');
        await loadSuperRootData();
      } catch (err) {
        showAlert(note, err.message);
      }
    });
  });
}

function resetProfileEditForm() {
  const form = document.getElementById('profileEditForm');
  if (!form) return;
  form.reset();
  form.elements.id.value = '';
  document.getElementById('profileEditTitle').textContent = 'Modifier un utilisateur';
}

async function handleProfileCreateSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('profileCreateNote');
  const fd = new FormData(e.target);

  try {
    await createUserAsSuperRoot({
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('full_name'),
      phone: fd.get('phone'),
      address: fd.get('address'),
      company: fd.get('company'),
      role: fd.get('role')
    });
    e.target.reset();
    showAlert(note, 'Utilisateur créé. Il peut confirmer son e-mail puis se connecter.', 'success');
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
  form.elements.company.value = profile.company || '';
  form.elements.full_name.value = profile.full_name || '';
  form.elements.email.value = profile.email || '';
  form.elements.phone.value = profile.phone || '';
  form.elements.address.value = profile.address || '';
  form.elements.role.value = profile.role || 'client';
  document.getElementById('profileEditTitle').textContent = `Modifier ${profileLabel(profile)}`;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  try {
    await updateProfileAsSuperRoot(profileId, {
      company: fd.get('company') || '',
      full_name: fd.get('full_name') || '',
      email: fd.get('email') || '',
      phone: fd.get('phone') || '',
      address: fd.get('address') || '',
      role: fd.get('role')
    });
    showAlert(note, 'Utilisateur mis à jour.', 'success');
    await loadSuperRootData();
  } catch (err) {
    showAlert(note, err.message);
  }
}

function renderPriceSelectors() {
  const profileSelect = document.getElementById('priceProfileSelect');
  const productSelect = document.getElementById('priceProductSelect');
  if (profileSelect) {
    const clients = superRootProfiles.filter((profile) => profile.role === 'client');
    profileSelect.innerHTML = clients.map((profile) => `
      <option value="${profile.id}">${escapeHtml(profileLabel(profile))}</option>
    `).join('');
  }
  if (productSelect) {
    productSelect.innerHTML = superRootProducts.map((product) => `
      <option value="${product.slug}">${escapeHtml(productLabel(product))}</option>
    `).join('');
  }
}

function renderCustomerPricesTable() {
  const body = document.getElementById('customerPricesBody');
  if (!body) return;
  const profileMap = new Map(superRootProfiles.map((profile) => [profile.id, profile]));
  const productMap = new Map(superRootProducts.map((product) => [product.slug, product]));

  body.innerHTML = superRootPrices.length ? superRootPrices.map((price) => `
    <tr>
      <td>${escapeHtml(profileLabel(profileMap.get(price.profile_id)))}</td>
      <td>${escapeHtml(productLabel(productMap.get(price.product_slug)) || price.product_slug)}</td>
      <td><strong>${formatPrice(price.price)}</strong></td>
      <td><button type="button" class="btn btn-sm btn-outline-dark" data-delete-price="${price.id}">Supprimer</button></td>
    </tr>
  `).join('') : '<tr><td colspan="4">Aucun prix personnalisé.</td></tr>';

  body.querySelectorAll('[data-delete-price]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteCustomerPrice(btn.dataset.deletePrice);
      await loadSuperRootData();
    });
  });
}

async function handleCustomerPriceSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('customerPriceNote');
  const fd = new FormData(e.target);
  try {
    await upsertCustomerPrice({
      profileId: fd.get('profile_id'),
      productSlug: fd.get('product_slug'),
      price: parseFloat(fd.get('price'))
    });
    e.target.reset();
    showAlert(note, 'Prix personnalisé enregistré.', 'success');
    await loadSuperRootData();
  } catch (err) {
    showAlert(note, err.message);
  }
}

document.addEventListener('DOMContentLoaded', initSuperRoot);
