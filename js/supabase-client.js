let supabaseClient = null;

function normalizeSupabaseUrl(url) {
  if (!url) return url;
  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

function isConfigured() {
  const cfg = window.HB_CONFIG;
  return cfg?.supabaseUrl && cfg?.supabaseAnonKey
    && !cfg.supabaseUrl.includes('VOTRE-PROJET')
    && !cfg.supabaseAnonKey.includes('VOTRE-CLE');
}

function getSupabase() {
  if (!isConfigured()) return null;
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(
      normalizeSupabaseUrl(window.HB_CONFIG.supabaseUrl),
      window.HB_CONFIG.supabaseAnonKey
    );
  }
  return supabaseClient;
}

function configErrorMessage() {
  return 'Supabase n\'est pas configuré. Copiez js/config.example.js vers js/config.js et ajoutez vos clés.';
}

function mapAuthError(err) {
  const msg = err?.message || '';
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('fetch')) {
    return 'Impossible de joindre Supabase. Vérifiez que le projet hb-commerce est actif dans le dashboard Supabase (réactiver si en pause), puis réessayez dans 1–2 minutes.';
  }
  return msg || 'Erreur inconnue.';
}
