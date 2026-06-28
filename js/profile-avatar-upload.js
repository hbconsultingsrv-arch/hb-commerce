/**
 * Upload photo de profil → Supabase Storage (bucket profile-avatars)
 */

const PROFILE_AVATAR_BUCKET = 'profile-avatars';
const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

function getProfileAvatarExtension(file) {
  const fromName = (file.name || '').split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  const mime = (file.type || '').toLowerCase();
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
}

async function uploadProfileAvatar(file, userId) {
  if (!file || !(file instanceof File) || file.size === 0) {
    return { url: null, uploadError: null };
  }

  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    return { url: null, uploadError: 'Fichier non reconnu comme image.' };
  }

  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    return { url: null, uploadError: 'Image trop volumineuse (max 5 Mo).' };
  }

  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());

  const ext = getProfileAvatarExtension(file);
  const path = `${userId}/avatar.${ext}`;

  const { error } = await sb.storage.from(PROFILE_AVATAR_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
  });

  if (error) {
    console.warn('uploadProfileAvatar:', error.message);
    return { url: null, uploadError: error.message };
  }

  const { data } = sb.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path);
  const url = data?.publicUrl ? `${data.publicUrl}?v=${Date.now()}` : null;
  return { url, path };
}

function setProfileAvatarPreview(src) {
  const preview = document.getElementById('profileAvatarPreview');
  const wrap = document.getElementById('profileAvatarPreviewWrap');
  const initials = document.getElementById('profileAvatarInitials');
  if (!preview || !wrap) return;

  if (src) {
    preview.src = src;
    preview.hidden = false;
    wrap.hidden = false;
    if (initials) initials.hidden = true;
  } else {
    preview.removeAttribute('src');
    preview.hidden = true;
    if (initials) initials.hidden = false;
  }
}

function initProfileAvatarUpload(profile, session) {
  const fileInput = document.getElementById('profileAvatarFile');
  const clearBtn = document.getElementById('profileAvatarClearBtn');
  if (!fileInput) return;

  const name = typeof profileDisplayName === 'function'
    ? profileDisplayName(profile, session)
    : (profile?.full_name || session?.user?.email || '?');
  const initialsEl = document.getElementById('profileAvatarInitials');
  if (initialsEl && typeof profileInitials === 'function') {
    initialsEl.textContent = profileInitials(name);
  }

  const currentUrl = typeof resolveProfileAvatarUrl === 'function'
    ? resolveProfileAvatarUrl(profile, session)
    : profile?.avatar_url;
  setProfileAvatarPreview(currentUrl || null);

  if (fileInput.dataset.bound === '1') return;
  fileInput.dataset.bound = '1';

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  });

  clearBtn?.addEventListener('click', () => {
    fileInput.value = '';
    setProfileAvatarPreview(null);
  });
}

window.uploadProfileAvatar = uploadProfileAvatar;
window.initProfileAvatarUpload = initProfileAvatarUpload;
window.setProfileAvatarPreview = setProfileAvatarPreview;
