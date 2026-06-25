/**
 * API Livreurs — Supabase + fallback localStorage
 */

const DRIVER_LOCAL_KEY = 'hb_delivery_drivers';

function driverReadLocal() {
  try {
    const raw = localStorage.getItem(DRIVER_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function driverWriteLocal(items) {
  localStorage.setItem(DRIVER_LOCAL_KEY, JSON.stringify(items));
}

async function fetchDeliveryDrivers(activeOnly = false) {
  const sb = getSupabase();
  if (!sb) {
    const items = driverReadLocal();
    return activeOnly ? items.filter((d) => d.active !== false) : items;
  }
  let q = sb.from('delivery_drivers').select('*').order('full_name', { ascending: true });
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) {
    console.warn('delivery_drivers:', error.message);
    const items = driverReadLocal();
    return activeOnly ? items.filter((d) => d.active !== false) : items;
  }
  if (data?.length) driverWriteLocal(data);
  return data || [];
}

async function createDeliveryDriver(payload) {
  const sb = getSupabase();
  const now = new Date().toISOString();
  if (!sb) {
    const items = driverReadLocal();
    const row = { id: crypto.randomUUID(), active: true, created_at: now, updated_at: now, ...payload };
    items.push(row);
    driverWriteLocal(items);
    return row;
  }
  const { data, error } = await sb.from('delivery_drivers').insert({ ...payload, updated_at: now }).select().single();
  if (error) throw error;
  return data;
}

async function createDriverUser({ driverId, email, password, fullName, phone, vehicleInfo }) {
  const authClient = getDetachedSupabaseClient();
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      data: { full_name: fullName || '', phone: phone || '', company: 'Livreur HB Commerce' }
    }
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error('Compte livreur non créé dans Supabase Auth.');

  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data: savedProfile, error: profileError } = await sb
    .from('profiles')
    .upsert({
      id: data.user.id,
      email,
      full_name: fullName || '',
      phone: phone || '',
      company: 'Livreur HB Commerce',
      driver_id: driverId,
      role: 'livreur'
    }, { onConflict: 'id' })
    .select()
    .single();
  if (profileError) throw profileError;
  return savedProfile;
}

async function fetchDriverDeliveries(driverId) {
  const sb = getSupabase();
  if (!sb || !driverId) return [];
  const { data, error } = await sb
    .from('orders')
    .select('*, order_items(*), customer:profiles!orders_user_id_fkey(full_name, company, phone, address, email)')
    .eq('assigned_driver_id', driverId)
    .not('status', 'eq', 'annulee')
    .order('estimated_delivery_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('fetchDriverDeliveries:', error.message);
    return [];
  }
  return data || [];
}

async function updateDriverDelivery(orderId, fields) {
  const allowed = {};
  ['delivery_status', 'delivered_at', 'delivery_notes', 'carrier', 'tracking_number'].forEach((k) => {
    if (fields[k] !== undefined) allowed[k] = fields[k];
  });
  if (allowed.delivery_status === 'livree' && !allowed.delivered_at) {
    allowed.delivered_at = new Date().toISOString();
  }
  if (allowed.delivery_status === 'livree') {
    allowed.status = 'livree';
  }
  if (allowed.delivery_status === 'en_transit') {
    allowed.status = 'expediee';
  }

  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb.from('orders').update(allowed).eq('id', orderId).select('*, order_items(*)').single();
  if (error) throw error;
  return data;
}

async function assignDriverToOrder(orderId, driverId) {
  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());
  const { data, error } = await sb
    .from('orders')
    .update({ assigned_driver_id: driverId || null })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

window.fetchDeliveryDrivers = fetchDeliveryDrivers;
window.createDeliveryDriver = createDeliveryDriver;
window.createDriverUser = createDriverUser;
window.fetchDriverDeliveries = fetchDriverDeliveries;
window.updateDriverDelivery = updateDriverDelivery;
window.assignDriverToOrder = assignDriverToOrder;
