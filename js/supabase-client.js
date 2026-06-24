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
  if (!err) return 'Erreur inconnue.';
  if (typeof err === 'string') return err;
  const msg = String(err.message || err.error_description || err.msg || '').trim();
  const code = String(err.code || err.error || '').trim();
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('fetch')) {
    return 'Impossible de joindre Supabase. Vérifiez que le projet est actif (réactiver si en pause).';
  }
  if (code === 'invalid_credentials' || msg.includes('Invalid login credentials')) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (msg === 'Email not confirmed' || code === 'email_not_confirmed') {
    return 'Confirmez votre e-mail avant de vous connecter.';
  }
  return msg || code || 'Erreur de connexion.';
}
