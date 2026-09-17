// Carga del logo institucional (public/logo.png) como binario listo para ImageRun de docx.

async function obtenerDimensiones(blob, objectUrl) {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      const w = bitmap.width || 0;
      const h = bitmap.height || 0;
      if (typeof bitmap.close === 'function') bitmap.close();
      if (w > 0 && h > 0) return { width: w, height: h };
    }
  } catch { /* fallback a Image */ }
  try {
    const dims = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = objectUrl;
    });
    if (dims.width > 0 && dims.height > 0) return dims;
  } catch { /* sin dimensiones */ }
  return { width: 600, height: 200 };
}

export async function cargarImagen(url) {
  const base = (import.meta.env.BASE_URL || '/');
  const baseLimpia = base.endsWith('/') ? base.slice(0, -1) : base;

  const candidatos = [
    url,
    `${baseLimpia}/logo.png`,
    '/logo.png',
    'logo.png',
  ];
  const vistos = [...new Set(candidatos.filter(Boolean))];

  for (const intento of vistos) {
    try {
      const response = await fetch(intento, { cache: 'no-store' });
      if (!response.ok) {
        console.warn(`Logo: status ${response.status} en ${intento}`);
        continue;
      }
      const blob = await response.blob();
      if (!blob.type || !blob.type.startsWith('image/')) {
        console.warn(`Logo: contenido no es imagen en ${intento} (type=${blob.type})`);
        continue;
      }
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      const objectUrl = URL.createObjectURL(blob);
      let width = 0, height = 0;
      try {
        const dims = await obtenerDimensiones(blob, objectUrl);
        width = dims.width;
        height = dims.height;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      return { data, width, height };
    } catch (error) {
      console.warn(`No se pudo cargar el logo desde ${intento}:`, error);
    }
  }
  console.warn('No se pudo cargar el logo en ninguna ruta:', vistos);
  return null;
}
