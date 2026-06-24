/**
 * Extension admin stock — hooks DOM (admin.js garde ses variables internes)
 */
(function initAdminStockHooks() {
  let cachedProducts = [];

  async function refreshProductsTableWithStock() {
    const body = document.getElementById('productsBody');
    if (!body) return;

    cachedProducts = await fetchAllProducts();
    const suppliers = adminSuppliers?.length ? adminSuppliers : await fetchAllSuppliers();
    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    if (!body.querySelector('th') && body.closest('table')) {
      const headRow = body.closest('table')?.querySelector('thead tr');
      if (headRow && !headRow.querySelector('[data-stock-col]')) {
        const priceTh = [...headRow.children].find((th) => th.textContent.trim() === 'Prix');
        if (priceTh) {
          const th = document.createElement('th');
          th.dataset.stockCol = '1';
          th.textContent = 'Stock';
          priceTh.insertAdjacentElement('afterend', th);
        }
      }
    }

    body.innerHTML = cachedProducts.map((p) => `
      <tr>
        <td><img src="${escapeHtml(p.image_url || '')}" alt="" width="52" height="52" style="object-fit:cover;border-radius:8px;background:#f5f0e6"></td>
        <td><strong>${escapeHtml(p.name)}</strong>${p.origin ? `<br><small>${escapeHtml(p.origin)}</small>` : ''}</td>
        <td>${escapeHtml(supplierMap.get(p.supplier_id)?.name || '—')}</td>
        <td>${formatPrice(p.price)} / ${escapeHtml(p.unit || '')}</td>
        <td>${typeof renderAdminStockCell === 'function' ? renderAdminStockCell(p) : (p.stock_quantity ?? '—')}</td>
        <td>${escapeHtml(p.tag || '—')}</td>
        <td>${p.active ? '✓ Visible' : 'Masqué'}</td>
        <td>
          <button type="button" class="btn btn-sm btn-outline-dark" data-stock-edit="${p.id}">Modifier</button>
          <button type="button" class="btn btn-sm btn-outline-dark" data-stock-delete="${p.id}">Supprimer</button>
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('[data-stock-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openProductEditor(btn.dataset.stockEdit));
    });
    body.querySelectorAll('[data-stock-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce produit ?')) return;
        await deleteProduct(btn.dataset.stockDelete);
        await refreshProductsTableWithStock();
      });
    });

    if (typeof populateStockReceiveProductSelect === 'function') {
      populateStockReceiveProductSelect(cachedProducts);
    }
    if (typeof renderStockAlertBanner === 'function') {
      await renderStockAlertBanner();
    }
  }

  function openProductEditor(id) {
    const p = cachedProducts.find((x) => x.id === id);
    if (!p) return;

    const form = document.getElementById('productForm');
    if (!form) return;

    form.name.value = p.name;
    form.slug.value = p.slug;
    form.description.value = p.description || '';
    form.origin.value = p.origin || '';
    form.category.value = p.category || '';
    form.price.value = p.price;
    form.unit.value = p.unit || 'litre';
    if (form.supplier_id) form.supplier_id.value = p.supplier_id || '';
    form.min_quantity.value = p.min_quantity || 1;
    form.image_url.value = p.image_url;
    form.tag.value = p.tag || '';
    form.sort_order.value = p.sort_order || 0;
    form.active.checked = p.active;
    if (form.stock_quantity) form.stock_quantity.value = p.stock_quantity ?? 0;
    if (form.min_stock_alert) form.min_stock_alert.value = p.min_stock_alert ?? 10;

    form.dataset.editingId = id;
    document.getElementById('productFormTitle').textContent = 'Modifier le produit';
    document.getElementById('saveProductBtn').textContent = 'Enregistrer';
    if (typeof activateSectionTab === 'function') activateSectionTab('panel-produits', 'formulaire');
  }

  function injectProductFormStockFields() {
    const form = document.getElementById('productForm');
    if (!form || form.querySelector('[name="stock_quantity"]')) return;

    const minQtyLabel = form.querySelector('[name="min_quantity"]')?.closest('label');
    if (!minQtyLabel) return;

    const row = document.createElement('div');
    row.className = 'form-row';
    row.innerHTML = `
      <label>Quantité en stock<input type="number" name="stock_quantity" min="0" value="0"></label>
      <label>Seuil alerte (min.)<input type="number" name="min_stock_alert" min="0" value="10" title="Alerte quand le stock atteint ce niveau"></label>
    `;
    minQtyLabel.parentElement.insertBefore(row, minQtyLabel.nextSibling);
  }

  function injectStockAlertBanner() {
    const header = document.querySelector('.dashboard-header');
    if (!header || document.getElementById('stockAlertBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'stockAlertBanner';
    banner.hidden = true;
    header.insertAdjacentElement('afterend', banner);
  }

  function injectReapproSection() {
    const panel = document.getElementById('panel-produits');
    if (!panel || document.getElementById('stockReceiveForm')) return;

    const tabs = panel.querySelector('[data-section-tabs]');
    if (tabs && !tabs.querySelector('[data-section="reappro"]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'section-tab';
      btn.dataset.section = 'reappro';
      btn.textContent = 'Réapprovisionner';
      tabs.appendChild(btn);

      const link = document.createElement('a');
      link.href = 'stock.html';
      link.className = 'btn btn-sm btn-outline-dark';
      link.style.marginLeft = 'auto';
      link.textContent = 'Page stock';
      tabs.appendChild(link);
    }

    const section = document.createElement('div');
    section.dataset.sectionPanel = 'reappro';
    section.className = 'dashboard-card';
    section.hidden = true;
    section.innerHTML = `
      <h2>Réapprovisionner (achat reçu)</h2>
      <form id="stockReceiveForm" class="auth-form">
        <label>Produit<select name="product_slug" id="stockReceiveProductSelect" required></select></label>
        <label>Quantité reçue<input type="number" name="quantity" min="1" required></label>
        <label>Notes<textarea name="notes" rows="2"></textarea></label>
        <button type="submit" class="btn btn-primary">Ajouter au stock</button>
        <p class="form-note" id="stockReceiveNote"></p>
      </form>
    `;
    panel.appendChild(section);
  }

  async function handleProductFormStock(e) {
    const form = e.target;
    if (form.id !== 'productForm') return;

    const fd = new FormData(form);
    const payload = {
      name: fd.get('name'),
      slug: fd.get('slug') || slugify(fd.get('name')),
      description: fd.get('description'),
      origin: fd.get('origin'),
      category: fd.get('category'),
      price: parseFloat(fd.get('price')),
      unit: fd.get('unit'),
      supplier_id: fd.get('supplier_id') || null,
      min_quantity: parseInt(fd.get('min_quantity'), 10) || 1,
      image_url: fd.get('image_url'),
      tag: fd.get('tag'),
      sort_order: parseInt(fd.get('sort_order'), 10) || 0,
      active: fd.has('active'),
      stock_quantity: parseInt(fd.get('stock_quantity'), 10) || 0,
      min_stock_alert: parseInt(fd.get('min_stock_alert'), 10) || 10
    };

    e.preventDefault();
    e.stopImmediatePropagation();

    const note = document.getElementById('productNote');
    const editingId = form.dataset.editingId || '';

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        showAlert(note, 'Produit et stock mis à jour.', 'success');
      } else {
        await createProduct(payload);
        showAlert(note, 'Produit ajouté.', 'success');
      }
      delete form.dataset.editingId;
      form.reset();
      form.active.checked = true;
      if (form.stock_quantity) form.stock_quantity.value = 0;
      if (form.min_stock_alert) form.min_stock_alert.value = 10;
      document.getElementById('productFormTitle').textContent = 'Ajouter un produit';
      document.getElementById('saveProductBtn').textContent = 'Ajouter';
      if (typeof activateSectionTab === 'function') activateSectionTab('panel-produits', 'liste');
      await refreshProductsTableWithStock();
    } catch (err) {
      showAlert(note, err.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStockAlertBanner();
    injectProductFormStockFields();
    injectReapproSection();

    const form = document.getElementById('productForm');
    form?.addEventListener('submit', handleProductFormStock, true);

    const nav = document.querySelector('.nav-actions');
    if (nav && !nav.querySelector('[href="stock.html"]')) {
      nav.insertAdjacentHTML('afterbegin', '<a href="stock.html" class="btn btn-sm btn-outline-light">Stock</a>');
    }

    setTimeout(refreshProductsTableWithStock, 1200);

    document.querySelector('[data-tab="produits"]')?.addEventListener('click', () => {
      setTimeout(refreshProductsTableWithStock, 300);
    });
  });
})();
