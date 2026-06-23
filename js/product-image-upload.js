/**
 * Upload image produit → Supabase Storage (bucket product-images)
 * L'URL publique est enregistrée dans products.image_url
 */

const PRODUCT_IMAGE_BUCKET = 'product-images';
const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_PRODUCT_IMAGE = 'images/prenium.PNG';

function getProductImageExtension(file) {
  const fromName = (file.name || '').split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  const mime = (file.type || '').toLowerCase();
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('bmp')) return 'bmp';
  if (mime.includes('heic') || mime.includes('heif')) return 'heic';
  return 'jpg';
}

async function uploadProductImage(file, slugHint = 'product') {
  if (!file || !(file instanceof File) || file.size === 0) {
    return { url: null, path: null, name: file?.name || null };
  }

  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|svg|bmp|heic|heif)$/i.test(file.name)) {
    return { url: null, uploadError: 'Fichier non reconnu comme image.' };
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return { url: null, uploadError: 'Image trop volumineuse (max 10 Mo).' };
  }

  const sb = getSupabase();
  if (!sb) throw new Error(configErrorMessage());

  const safeSlug = (slugHint || 'product').toString().replace(/[^\w\-]+/g, '-').slice(0, 60);
  const ext = getProductImageExtension(file);
  const path = `products/${safeSlug}-${Date.now()}.${ext}`;

  const { error } = await sb.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`
  });

  if (error) {
    console.warn('uploadProductImage:', error.message);
    return { url: null, name: file.name, uploadError: error.message };
  }

  const { data } = sb.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return {
    url: data?.publicUrl || null,
    path,
    name: file.name
  };
}

function setProductImagePreview(src) {
  const preview = document.getElementById('productImagePreview');
  const wrap = document.getElementById('productImagePreviewWrap');
  if (!preview) return;
  if (src) {
    preview.src = src;
    preview.hidden = false;
    if (wrap) wrap.hidden = false;
  } else {
    preview.removeAttribute('src');
    preview.hidden = true;
    if (wrap) wrap.hidden = true;
  }
}

function clearProductImageFileInput() {
  const fileInput = document.getElementById('productImageFile');
  if (fileInput) fileInput.value = '';
}

function initProductImageUpload() {
  const fileInput = document.getElementById('productImageFile');
  const clearBtn = document.getElementById('productImageClearBtn');
  if (!fileInput) return;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    setProductImagePreview(URL.createObjectURL(file));
    const urlField = document.querySelector('#productForm [name="image_url"]');
    if (urlField) urlField.value = '';
  });

  clearBtn?.addEventListener('click', () => {
    clearProductImageFileInput();
    setProductImagePreview('');
  });
}

window.uploadProductImage = uploadProductImage;
window.initProductImageUpload = initProductImageUpload;
window.setProductImagePreview = setProductImagePreview;
window.clearProductImageFileInput = clearProductImageFileInput;
window.DEFAULT_PRODUCT_IMAGE = DEFAULT_PRODUCT_IMAGE;
