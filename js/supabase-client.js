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
    return 'Impossible de joindre Supabase. Vérifiez que le projet hb-commerce est actif dans le dashboard Supabase (réactiver si en pause), puis réessayez dans 1–2 minutes.';
  }
  if (
    code === 'invalid_credentials'
    || msg === 'Invalid login credentials'
    || msg.includes('Invalid login credentials')
  ) {
    return 'E-mail ou mot de passe incorrect. Si vous utilisez les comptes demo, relancez supabase/seed-demo-data.sql dans Supabase.';
  }
  if (msg === 'Email not confirmed' || code === 'email_not_confirmed') {
    return 'Confirmez votre e-mail avant de vous connecter.';
  }
  if (msg) return msg;
  if (code) return code;
  return 'Erreur de connexion. Vérifiez vos identifiants ou relancez le script de demo Supabase.';
}
