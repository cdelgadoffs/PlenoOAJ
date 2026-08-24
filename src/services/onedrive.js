// services/onedrive.js
// Migrado literalmente de onedrive.js. Única diferencia estructural: en vez
// de depender de la función global obtenerAccessToken(), la recibe como
// parámetro (viene de useAuth() en el componente que lo use).
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

function codificarRutaGraph(ruta) {
  return ruta.split('/').map(encodeURIComponent).join('/');
}

async function graphFetch(obtenerAccessToken, path, options = {}) {
  const accessToken = await obtenerAccessToken(['Files.ReadWrite']);
  const resp = await fetch(GRAPH_BASE + path, {
    ...options,
    headers: { 'Authorization': 'Bearer ' + accessToken, ...(options.headers || {}) }
  });
  if (!resp.ok && resp.status !== 404) {
    const detalle = await resp.text();
    throw new Error(`Graph ${resp.status}: ${detalle}`);
  }
  return resp;
}

async function buscarItemPorRuta(obtenerAccessToken, rutaRelativa) {
  const ruta = codificarRutaGraph(rutaRelativa);
  const resp = await graphFetch(obtenerAccessToken, `/me/drive/root:/${ruta}`);
  if (resp.status === 404) return null;
  return resp.json();
}

async function crearOReutilizarCarpeta(obtenerAccessToken, carpetaPadreId, nombre) {
  try {
    const resp = await graphFetch(obtenerAccessToken, `/me/drive/items/${carpetaPadreId}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nombre, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' })
    });
    return await resp.json();
  } catch (err) {
    if (err.message.includes('409')) {
      const listado = await graphFetch(obtenerAccessToken, `/me/drive/items/${carpetaPadreId}/children?$filter=name eq '${nombre.replace(/'/g, "''")}'`);
      const data = await listado.json();
      if (data.value && data.value.length > 0) return data.value[0];
    }
    throw err;
  }
}

async function obtenerCarpetaSesionesAnio(obtenerAccessToken, anio) {
  const nombreCarpeta = `Sesiones ${anio}`;
  let item = await buscarItemPorRuta(obtenerAccessToken, nombreCarpeta);
  if (item) return item;
  const raizResp = await graphFetch(obtenerAccessToken, '/me/drive/root');
  const raizData = await raizResp.json();
  return crearOReutilizarCarpeta(obtenerAccessToken, raizData.id, nombreCarpeta);
}

export async function crearCarpetaProyecto(obtenerAccessToken, nombreCarpetaProyecto, anio) {
  const carpetaAnio = await obtenerCarpetaSesionesAnio(obtenerAccessToken, anio);
  return crearOReutilizarCarpeta(obtenerAccessToken, carpetaAnio.id, nombreCarpetaProyecto);
}

export async function crearCarpetaPunto(obtenerAccessToken, carpetaProyectoId, nombreCarpetaPunto) {
  return crearOReutilizarCarpeta(obtenerAccessToken, carpetaProyectoId, nombreCarpetaPunto);
}

export async function subirArchivoAOneDrive(obtenerAccessToken, carpetaId, nombreArchivo, dataUrlBase64, contentType) {
  const base64 = dataUrlBase64.includes(',') ? dataUrlBase64.split(',')[1] : dataUrlBase64;
  if (!base64) throw new Error('El contenido del archivo está vacío o no es un data URL válido.');
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);

  const nombreCodificado = encodeURIComponent(nombreArchivo);
  const resp = await graphFetch(obtenerAccessToken, `/me/drive/items/${carpetaId}:/${nombreCodificado}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': contentType || 'application/octet-stream' },
    body: bytes
  });
  return resp.json();
}
