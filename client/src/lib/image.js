// Every photo (or sample bill) goes through a canvas: shrunk to at most 1600 px,
// re-encoded as JPEG. Keeps uploads small and strips camera metadata (EXIF,
// including GPS location) before anything leaves the browser.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be opened as an image.'));
    img.src = src;
  });
}

function draw(img, max, quality) {
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  const scale = Math.min(1, max / Math.max(w0, h0));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w0 * scale);
  canvas.height = Math.round(h0 * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function prepareImage(source) {
  const isFile = source instanceof Blob;
  const url = isFile ? URL.createObjectURL(source) : source;
  try {
    const img = await loadImage(url);
    const full = draw(img, 1600, 0.88);
    const thumb = draw(img, 360, 0.7);
    return { mimeType: 'image/jpeg', data: full.split(',')[1], thumb };
  } finally {
    if (isFile) URL.revokeObjectURL(url);
  }
}
