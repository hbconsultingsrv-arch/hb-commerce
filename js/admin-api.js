async function isAdmin() {
  const session = await getSession();
  if (!session) return false;
  const profile = await getProfile(session.user.id);
  return profile?.role === 'admin';
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

async function createOrder({ userId, items, total, paymentMethod, notes, shippingAddress }) {
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
      shipping_address: shippingAddress
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
