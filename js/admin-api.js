async function isAdmin() {
  const session = await getSession();
  if (!session) return false;
  let profile = null;
  try {
    profile = await getProfile(session.user.id);
  } catch (err) {
    console.warn('isAdmin:', err.message);
  }
  const role = resolveProfileRole(profile, session);
  return role === 'admin' || role === 'super_root';
}

async function isFullAdmin() {
  const session = await getSession();
  if (!session) return false;
  const profile = await getProfile(session.user.id);
  return isAdminProfile(profile);
}

async function requireAdmin() {
  const session = await requireAuth('login.html?redirect=admin.html');
  if (!session) return null;
  let profile = null;
  try {
    profile = await getProfile(session.user.id);
  } catch (err) {
    console.warn('requireAdmin:', err.message);
  }
  const role = resolveProfileRole(profile, session);
  if (role === 'agent_commercial') {
    window.location.href = 'agent.html';
    return null;
  }
  if (role !== 'admin' && role !== 'super_root') {
    if (role === 'livreur') {
      window.location.href = 'livreur.html';
    } else if (role === 'supplier') {
      window.location.href = 'supplier.html';
    } else {
      window.location.href = 'compte.html';
    }
    return null;
  }
  return session;
}

async function requireCommercialSpace() {
  const session = await requireAuth('login.html?redirect=agent.html');
  if (!session) return null;
  const profile = await getProfile(session.user.id);
  const allowed = isCommercialAgentProfile(profile) || isAdminProfile(profile);
  if (!allowed) {
    if (isDriverProfile(profile)) {
      window.location.href = 'livreur.html';
    } else if (isSupplierProfile(profile)) {
      window.location.href = 'supplier.html';
    } else {
      window.location.href = 'compte.html';
    }
    return null;
  }
  return session;
}

async function isSuperRoot() {
  const session = await getSession();
  if (!session) return false;
  let profile = null;
  try {
    profile = await getProfile(session.user.id);
  } catch (err) {
    console.warn('isSuperRoot:', err.message);
  }
  return resolveProfileRole(profile, session) === 'super_root';
}

async function requireSuperRoot() {
  const session = await requireAuth('login.html?redirect=admin.html?tab=equipe');
  if (!session) return null;
  const superRoot = await isSuperRoot();
  if (!superRoot) {
    window.location.href = 'compte.html';
    return null;
  }
  return session;
}

async function fetchProfilesQuery(buildQuery) {
  const sb = getSupabase();
  if (!sb) return [];
  const baseSelect = 'id,email,full_name,phone,company,role,driver_id,commercial_agent_id,created_at,updated_at';
  let { data, error } = await buildQuery(sb.from('profiles').select(`${baseSelect},avatar_url`));
  if (error && typeof isAvatarUrlColumnMissingError === 'function' && isAvatarUrlColumnMissingError(error)) {
    ({ data, error } = await buildQuery(sb.from('profiles').select(baseSelect)));
  }
  if (error) throw error;
  return data || [];
}

async function fetchAllProfiles() {
  return fetchProfilesQuery((query) => query.order('created_at', { ascending: false }));
}

async function fetchInternalProfiles() {
  const rows = await fetchProfilesQuery((query) => query
    .in('role', ['agent_commercial', 'admin', 'super_root', 'livreur'])
    .order('full_name', { ascending: true }));
  return rows.filter((profile) => !['client', 'supplier', 'pending_company'].includes(profile.role));
}

async function bootstrapDemoSuperRoot() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('bootstrap_demo_super_root');
  if (error) {
    if (error.message?.includes('bootstrap_demo_super_root') || error.code === 'PGRST202') {
      return { ok: false, reason: 'rpc_missing' };
    }
    throw error;
  }
  return data;
}

async function updateProfileRole(profileId, role) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('profiles')
    .update({ role })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateProfileAsSuperRoot(profileId, fields) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('profiles')
    .update(fields)
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

function getDetachedSupabaseClient() {
  if (!isConfigured() || !window.supabase) throw new Error(configErrorMessage());
  return window.supabase.createClient(
    normalizeSupabaseUrl(window.HB_CONFIG.supabaseUrl),
    window.HB_CONFIG.supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
}

async function createClientUser({ email, password, fullName, phone, address, company, siren, vatNumber, commercialAgentId }) {
  const authClient = getDetachedSupabaseClient();
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      data: {
        full_name: fullName || '',
        phone: phone || '',
        company: company || '',
        address: address || '',
        siren: siren || '',
        vat_number: vatNumber || ''
      }
    }
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error('Utilisateur non créé dans Supabase Auth.');

  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const profile = {
    id: data.user.id,
    email,
    full_name: fullName || '',
    phone: phone || '',
    address: address || '',
    company: company || '',
    siren: siren || '',
    vat_number: vatNumber || '',
    commercial_agent_id: commercialAgentId || null,
    role: 'client'
  };
  const { data: savedProfile, error: profileError } = await sb
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
  if (profileError) throw profileError;
  return savedProfile;
}

async function createUserAsSuperRoot(fields) {
  return createClientUser(fields);
}

async function createCommercialAgentUser({ email, password, fullName, phone }) {
  const authClient = getDetachedSupabaseClient();
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      data: {
        full_name: fullName || '',
        phone: phone || '',
        company: 'HB Commerce'
      }
    }
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error('Agent non créé dans Supabase Auth.');

  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data: savedProfile, error: profileError } = await sb
    .from('profiles')
    .upsert({
      id: data.user.id,
      email,
      full_name: fullName || '',
      phone: phone || '',
      company: 'HB Commerce',
      role: 'agent_commercial'
    }, { onConflict: 'id' })
    .select()
    .single();
  if (profileError) throw profileError;
  return savedProfile;
}

async function createInternalUser({ email, password, fullName, phone, role }) {
  if (!['agent_commercial', 'admin', 'super_root'].includes(role)) {
    throw new Error('Rôle interne invalide.');
  }
  const authClient = getDetachedSupabaseClient();
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      data: {
        full_name: fullName || '',
        phone: phone || '',
        company: 'HB Commerce'
      }
    }
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error('Utilisateur interne non créé dans Supabase Auth.');

  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data: savedProfile, error: profileError } = await sb
    .from('profiles')
    .upsert({
      id: data.user.id,
      email,
      full_name: fullName || '',
      phone: phone || '',
      company: 'HB Commerce',
      role
    }, { onConflict: 'id' })
    .select()
    .single();
  if (profileError) throw profileError;
  return savedProfile;
}

async function createSupplierUser({ supplierId, email, password, fullName, phone, company, address, siren, vatNumber }) {
  const authClient = getDetachedSupabaseClient();
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      data: {
        full_name: fullName || '',
        phone: phone || '',
        company: company || 'Fournisseur',
        address: address || '',
        siren: siren || '',
        vat_number: vatNumber || ''
      }
    }
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error('Compte fournisseur non créé dans Supabase Auth.');

  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data: savedProfile, error: profileError } = await sb
    .from('profiles')
    .upsert({
      id: data.user.id,
      email,
      full_name: fullName || '',
      phone: phone || '',
      company: company || 'Fournisseur',
      address: address || '',
      siren: siren || '',
      vat_number: vatNumber || '',
      supplier_id: supplierId,
      role: 'supplier'
    }, { onConflict: 'id' })
    .select()
    .single();
  if (profileError) throw profileError;
  return savedProfile;
}

async function assignCommercialAgent(clientId, agentId) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('profiles')
    .update({ commercial_agent_id: agentId || null })
    .eq('id', clientId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function fetchAllProducts() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchAllSuppliers(activeOnly = false) {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function createSupplier(supplier) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('suppliers').insert(supplier).select().single();
  if (error) throw error;
  return data;
}

async function updateSupplier(id, fields) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('suppliers').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteSupplier(id) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { error } = await sb.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

async function fetchProductStocks(productSlugs = null) {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from('product_stocks').select('*');
  if (productSlugs?.length) query = query.in('product_slug', productSlugs);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchSupplierStocks(supplierId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('product_stocks')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('product_slug', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function upsertProductStock({ supplierId, productSlug, quantity, reservedQuantity = 0, leadTimeDays = 7 }) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('product_stocks')
    .upsert({
      supplier_id: supplierId,
      product_slug: productSlug,
      quantity,
      reserved_quantity: reservedQuantity,
      lead_time_days: leadTimeDays
    }, { onConflict: 'supplier_id,product_slug' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function fetchSupplierOrders(supplierId = null) {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from('supplier_orders').select('*').order('created_at', { ascending: false });
  if (supplierId) query = query.eq('supplier_id', supplierId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function createSupplierOrder(order) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('supplier_orders').insert(order).select().single();
  if (error) throw error;
  return data;
}

/** Insert achat fournisseur — retire les colonnes absentes et met les infos en notes. */
async function createSupplierOrderSafe(order) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());

  const extras = [];
  if (order.unit_price != null) extras.push(`Prix unitaire: ${order.unit_price} EUR`);
  if (order.total_price != null) extras.push(`Total: ${order.total_price} EUR`);
  if (order.order_date) extras.push(`Date achat: ${order.order_date}`);
  if (order.invoice_url) extras.push(`Facture URL: ${order.invoice_url}`);
  if (order.invoice_document_name) extras.push(`Facture fichier: ${order.invoice_document_name}`);

  let payload = {
    supplier_id: order.supplier_id,
    product_slug: order.product_slug,
    quantity: order.quantity,
    status: order.status || 'requested',
    expected_arrival_date: order.expected_arrival_date || null,
    notes: [order.notes, ...extras].filter(Boolean).join('\n'),
    unit_price: order.unit_price,
    total_price: order.total_price,
    order_date: order.order_date,
    invoice_url: order.invoice_url,
    invoice_document_name: order.invoice_document_name,
    depot_received: order.depot_received
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await sb.from('supplier_orders').insert(payload).select().single();
    if (!error) return data;

    const missing = error.message?.match(/Could not find the '([^']+)' column/);
    if (!missing || !(missing[1] in payload)) throw error;
    delete payload[missing[1]];
  }

  throw new Error('Impossible d\'enregistrer la commande fournisseur.');
}

async function updateSupplierOrder(id, fields) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('supplier_orders').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function createProduct(product) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('products').insert(product).select().single();
  if (error) throw error;
  return data;
}

async function updateProduct(id, fields) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('products').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteProduct(id) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) throw error;
}

async function fetchAllOrders() {
  const sb = getSupabase();
  if (!sb) return [];
  const withDriver = await sb
    .from('orders')
    .select('*, order_items(*), assigned_driver:delivery_drivers!orders_assigned_driver_id_fkey(id, full_name, email)')
    .order('created_at', { ascending: false });
  if (!withDriver.error) return withDriver.data || [];
  const { data, error } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchUserOrders(userId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchCustomerPrices(profileId) {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from('customer_prices').select('*').order('product_slug', { ascending: true });
  if (profileId) query = query.eq('profile_id', profileId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function upsertCustomerPrice({ profileId, productSlug, price }) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('customer_prices')
    .upsert({
      profile_id: profileId,
      product_slug: productSlug,
      price
    }, { onConflict: 'profile_id,product_slug' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteCustomerPrice(id) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { error } = await sb.from('customer_prices').delete().eq('id', id);
  if (error) throw error;
}

async function updateOrderStatus(id, status) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateOrderTracking(id, fields) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('orders')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function fetchAssignedCommercialAgent(clientProfile) {
  const agentId = clientProfile?.commercial_agent_id;
  if (!agentId) return null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('id, full_name, email, phone, role')
    .eq('id', agentId)
    .maybeSingle();
  if (error) throw error;
  return data?.role === 'agent_commercial' ? data : null;
}

async function fetchChatMessages(companyId = null) {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb
    .from('chat_messages')
    .select('*, company:profiles!chat_messages_company_id_fkey(company, full_name, email)')
    .order('created_at', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function sendCompanyChatMessage({ companyId, authorId, message }) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('chat_messages')
    .insert({
      company_id: companyId,
      author_id: authorId,
      author_role: 'client',
      message,
      status: 'pending'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function sendAdminChatMessage({ companyId, authorId, authorRole, message }) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('chat_messages')
    .insert({
      company_id: companyId,
      author_id: authorId,
      author_role: authorRole,
      message,
      status: 'approved'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function moderateChatMessage(id, status, moderatorId) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('chat_messages')
    .update({
      status,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('id, status, company_id')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error('Impossible de modérer ce message. Vérifiez vos droits ou réessayez.');
  }
  return data;
}

async function createOrder({ userId, items, total, paymentMethod, notes, shippingAddress, estimatedDeliveryDate, status }) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());

  const orderStatus = status || (paymentMethod === 'stripe' ? 'en_attente_paiement' : 'en_attente');

  const { data: order, error: orderError } = await sb
    .from('orders')
    .insert({
      user_id: userId,
      total,
      status: orderStatus,
      payment_method: paymentMethod,
      notes,
      shipping_address: shippingAddress,
      estimated_delivery_date: estimatedDeliveryDate || null
    })
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.id,
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    unit: item.unit
  }));

  const { error: itemsError } = await sb.from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  return order;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchBusinessExpenses() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('business_expenses')
    .select('*')
    .order('expense_date', { ascending: false });
  if (error) {
    if (error.message?.includes('business_expenses')) return [];
    throw error;
  }
  return data || [];
}

async function createBusinessExpense(expense) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('business_expenses')
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteBusinessExpense(id) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { error } = await sb.from('business_expenses').delete().eq('id', id);
  if (error) throw error;
}

async function fetchSiteRoadmapItems() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('site_roadmap_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    if (error.message?.includes('site_roadmap_items')) return null;
    throw error;
  }
  return data || [];
}

async function createSiteRoadmapItem(item) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('site_roadmap_items').insert(item).select().single();
  if (error) throw error;
  return data;
}

async function updateSiteRoadmapItem(id, fields) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('site_roadmap_items').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteSiteRoadmapItem(id) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { error } = await sb.from('site_roadmap_items').delete().eq('id', id);
  if (error) throw error;
}
