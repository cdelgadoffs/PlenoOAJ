// ============================================================
// onedrive.js – Integración con OneDrive vía Microsoft Graph
// Carpeta raíz manual: "Sesiones {año}" (creada a mano en OneDrive).
// Dentro: una carpeta por proyecto/sesión, y dentro de esa, una
// carpeta por cada punto del orden del día que tenga archivos.
// ============================================================

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// Codifica cada segmento de una ruta para usarla en URLs de Graph (rutas tipo /root:/A/B:/)
function codificarRutaGraph(ruta) {
  return ruta.split('/').map(encodeURIComponent).join('/');
}

async function graphFetch(path, options = {}) {
  try {
    const accessToken = await obtenerAccessToken(['Files.ReadWrite']);
    const resp = await fetch(GRAPH_BASE + path, {
      ...options,
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        ...(options.headers || {})
      }
    });
    if (!resp.ok) {
      const detalle = await resp.text();
      console.error('Graph error response:', detalle);
      throw new Error(`Graph ${resp.status}: ${detalle}`);
    }
    return resp;
  } catch (err) {
    console.error('graphFetch error:', err);
    throw err;
  }
}

// Busca una carpeta/archivo por ruta relativa a la raíz de OneDrive del usuario.
// Devuelve el objeto DriveItem de Graph, o null si no existe (404).
async function buscarItemPorRuta(rutaRelativa) {
  const ruta = codificarRutaGraph(rutaRelativa);
  const resp = await graphFetch(`/me/drive/root:/${ruta}`);
  if (resp.status === 404) return null;
  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`Graph error al buscar "${rutaRelativa}": ${resp.status} ${detalle}`);
  }
  return resp.json();
}

// Crea una subcarpeta dentro de "carpetaPadreId" con el nombre dado.
// Si ya existe una carpeta con ese nombre, la reutiliza (no falla, no duplica).
async function crearOReutilizarCarpeta(carpetaPadreId, nombre) {
  try {
    const resp = await graphFetch(`/me/drive/items/${carpetaPadreId}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nombre,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail'
      })
    });
    return await resp.json();
  } catch (err) {
    // Si el error es 409 (conflicto), buscamos la carpeta existente
    if (err.message.includes('409')) {
      const listado = await graphFetch(`/me/drive/items/${carpetaPadreId}/children?$filter=name eq '${nombre.replace(/'/g, "''")}'`);
      if (listado.ok) {
        const data = await listado.json();
        if (data.value && data.value.length > 0) return data.value[0];
      }
    }
    throw err;
  }
}

// Obtiene (o crea) la carpeta raíz "Sesiones {año}". Esta carpeta debe existir
// previamente creada a mano en OneDrive; si no existe, se crea automáticamente.
async function obtenerCarpetaSesionesAnio(anio) {
  const nombreCarpeta = `Sesiones ${anio}`;
  let item = await buscarItemPorRuta(nombreCarpeta);
  if (item) return item;

  // No existe todavía: la creamos en la raíz de OneDrive.
  const raizResp = await graphFetch('/me/drive/root');
  if (!raizResp.ok) throw new Error('No se pudo acceder a la raíz de OneDrive.');
  const raizData = await raizResp.json();
  return crearOReutilizarCarpeta(raizData.id, nombreCarpeta);
}

// Crea (o reutiliza) la carpeta del proyecto/sesión dentro de "Sesiones {año}".
// Devuelve el DriveItem de la carpeta del proyecto.
async function crearCarpetaProyecto(nombreCarpetaProyecto, anio) {
  const carpetaAnio = await obtenerCarpetaSesionesAnio(anio);
  return crearOReutilizarCarpeta(carpetaAnio.id, nombreCarpetaProyecto);
}

// Crea (o reutiliza) la carpeta de un punto específico dentro de la carpeta del proyecto.
async function crearCarpetaPunto(carpetaProyectoId, nombreCarpetaPunto) {
  return crearOReutilizarCarpeta(carpetaProyectoId, nombreCarpetaPunto);
}

// Sube un archivo (dado como data URL base64, tal como ya se generan en app.js) a una carpeta.
// Devuelve el DriveItem del archivo subido (incluye id y webUrl).
async function subirArchivoAOneDrive(carpetaId, nombreArchivo, dataUrlBase64, contentType) {
  // Extraer la parte base64 (después de la coma)
  const base64 = dataUrlBase64.includes(',') ? dataUrlBase64.split(',')[1] : dataUrlBase64;
  if (!base64) throw new Error('El contenido del archivo está vacío o no es un data URL válido.');
  
  // Decodificar base64 a Uint8Array
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }

  const nombreCodificado = encodeURIComponent(nombreArchivo);
  const resp = await graphFetch(`/me/drive/items/${carpetaId}:/${nombreCodificado}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': contentType || 'application/octet-stream' },
    body: bytes
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`No se pudo subir "${nombreArchivo}": ${resp.status} ${detalle}`);
  }
  return resp.json();
}

window.oneDrive = {
  crearCarpetaProyecto,
  crearCarpetaPunto,
  subirArchivoAOneDrive
};