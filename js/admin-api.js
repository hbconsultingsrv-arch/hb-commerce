async function isAdmin() {
  const session = await getSession();
  if (!session) return false;
  const profile = await getProfile(session.user.id);
  return isBackofficeProfile(profile);
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
  const admin = await isAdmin();
  if (!admin) {
    window.location.href = 'compte.html';
    return null;
  }
  return session;
}

async function isSuperRoot() {
  const session = await getSession();
  if (!session) return false;
  const profile = await getProfile(session.user.id);
  return isSuperRootProfile(profile);
}

async function requireSuperRoot() {
  const session = await requireAuth('login.html?redirect=super-root.html');
  if (!session) return null;
  const superRoot = await isSuperRoot();
  if (!superRoot) {
    window.location.href = 'compte.html';
    return null;
  }
  return session;
}

async function fetchAllProfiles() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchInternalProfiles() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .in('role', ['agent_commercial', 'admin', 'super_root'])
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data || []).filter((profile) => !['client', 'supplier', 'pending_company'].includes(profile.role));
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

async function createSupplierUser({ supplierId, email, password, fullName, phone }) {
  const authClient = getDetachedSupabaseClient();
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      data: {
        full_name: fullName || '',
        phone: phone || '',
        company: 'Fournisseur'
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
      company: 'Fournisseur',
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
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function createOrder({ userId, items, total, paymentMethod, notes, shippingAddress, estimatedDeliveryDate }) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());

  const status = paymentMethod === 'stripe' ? 'en_attente_paiement' : 'en_attente';

  const { data: order, error: orderError } = await sb
    .from('orders')
    .insert({
      user_id: userId,
      total,
      status,
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
