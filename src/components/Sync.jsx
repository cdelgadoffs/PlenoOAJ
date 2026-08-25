import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';

const FS_DB_NAME = 'ordenDiaFS';
const FS_DB_STORE = 'carpetas';

function fsAbrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(FS_DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function fsGuardarHandle(clave, handle) {
  const db = await fsAbrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_DB_STORE, 'readwrite');
    tx.objectStore(FS_DB_STORE).put(handle, clave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function fsObtenerHandle(clave) {
  const db = await fsAbrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_DB_STORE, 'readonly');
    const req = tx.objectStore(FS_DB_STORE).get(clave);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function fsEliminarHandle(clave) {
  const db = await fsAbrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_DB_STORE, 'readwrite');
    tx.objectStore(FS_DB_STORE).delete(clave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function fsVerificarPermiso(handle, modo) {
  const opts = { mode: modo || 'readwrite' };
  try {
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
  } catch (err) {
    console.error('Error verificando permisos de carpeta:', err);
  }
  return false;
}
function fsNombreArchivo(fecha, tipoSesion) {
  const prefijo = tipoSesion === 'Extraordinaria' ? 'ext' : 'ord';
  return `${prefijo}-${fecha}.json`;
}
async function fsEscribirArchivo(handle, nombre, datos) {
  const ok = await fsVerificarPermiso(handle, 'readwrite');
  if (!ok) return;
  const fileHandle = await handle.getFileHandle(nombre, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(datos, null, 2));
  await writable.close();
}
async function fsEliminarArchivo(handle, nombre) {
  try {
    const ok = await fsVerificarPermiso(handle, 'readwrite');
    if (!ok) return;
    await handle.removeEntry(nombre);
  } catch (err) { }
}

export default function Sync({ onVolver }) {
  const { cuentaActiva } = useAuth();
  const { sesiones, sesionActivaFecha } = useProyecto();
  const [handle, setHandle] = useState(null);
  const [nombreCarpeta, setNombreCarpeta] = useState(null);
  const [necesitaReconectar, setNecesitaReconectar] = useState(false);
  const soportado = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const claveUsuario = 'carpeta_' + (cuentaActiva?.username || 'default');

  // Restaurar carpeta 
  useEffect(() => {
    if (!soportado) return;
    (async () => {
      try {
        const h = await fsObtenerHandle(claveUsuario);
        if (!h) return;
        const permitido = await h.queryPermission({ mode: 'readwrite' });
        if (permitido === 'granted') {
          setHandle(h);
          setNombreCarpeta(h.name);
        } else {
          setNombreCarpeta(h.name + ' (toca "Seleccionar carpeta" para reconectar)');
          setNecesitaReconectar(true);
        }
      } catch (err) { console.error('No se pudo restaurar la carpeta local:', err); }
    })();
  }, [claveUsuario]);

  const primeraSincRef = useRef(true);
  useEffect(() => {
    if (!handle || !sesionActivaFecha || !sesiones[sesionActivaFecha]) return;
    if (primeraSincRef.current) { primeraSincRef.current = false; }
    const sesion = sesiones[sesionActivaFecha];
    const nombre = fsNombreArchivo(sesionActivaFecha, sesion.tipoSesion);
    fsEscribirArchivo(handle, nombre, {
      fecha: sesionActivaFecha,
      tipoSesion: sesion.tipoSesion,
      numeroSesion: sesion.numeroSesion,
      secciones: sesion.secciones
    }).catch(err => console.error(`No se pudo escribir el archivo ${nombre}:`, err));
  }, [handle, sesiones, sesionActivaFecha]);

  async function vincularCarpeta() {
    if (!soportado) { alert('Tu navegador no soporta la vinculación de carpetas locales. Usa Chrome o Edge de escritorio.'); return; }
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      const ok = await fsVerificarPermiso(h, 'readwrite');
      if (!ok) { alert('No se otorgaron permisos de escritura sobre la carpeta.'); return; }
      setHandle(h);
      setNombreCarpeta(h.name);
      setNecesitaReconectar(false);
      await fsGuardarHandle(claveUsuario, h);
      
      for (const fecha of Object.keys(sesiones)) {
        const sesion = sesiones[fecha];
        const nombre = fsNombreArchivo(fecha, sesion.tipoSesion);
        await fsEscribirArchivo(h, nombre, { fecha, tipoSesion: sesion.tipoSesion, numeroSesion: sesion.numeroSesion, secciones: sesion.secciones });
      }
    } catch (err) {
      if (err.name !== 'AbortError') { console.error('Error al vincular carpeta:', err); alert('No se pudo vincular la carpeta.'); }
    }
  }

  async function desvincularCarpeta() {
    setHandle(null);
    setNombreCarpeta(null);
    setNecesitaReconectar(false);
    await fsEliminarHandle(claveUsuario);
  }

  let estadoTexto = 'Ninguna carpeta vinculada';
  let estadoClase = 'email-status';
  if (handle) { estadoTexto = `Vinculada: ${nombreCarpeta}`; estadoClase = 'email-status ok'; }
  else if (nombreCarpeta) { estadoTexto = nombreCarpeta; estadoClase = 'email-status error'; }

  return (
    <div className="sb-nav nuevo-panel" id="panelSync">
      <button className="btn-volver-nuevo" id="btnVolverMenuSync" onClick={onVolver}>‹ Volver</button>
      <div className="email-field">
        <label className="email-label">Carpeta de respaldo local</label>
        <div id="syncStatus" className={estadoClase}>{estadoTexto}</div>
        <button id="btnVincularCarpeta" className="btn-enviar-email" style={{ marginTop: '8px' }} onClick={vincularCarpeta}>Seleccionar carpeta</button>
        {(handle || necesitaReconectar) && (
          <button id="btnDesvincularCarpeta" className="btn-add-invitado" style={{ width: '100%', marginTop: '8px' }} onClick={desvincularCarpeta}>Desvincular carpeta</button>
        )}
      </div>
      <div className="email-field">
        <label className="email-label">Info</label>
        <div style={{ fontSize: '11.5px', color: '#999', lineHeight: '1.5' }}>
          Cada sesión se guarda automáticamente como un archivo JSON individual: ord-AAAA-MM-DD.json para ordinarias, ext-AAAA-MM-DD.json para extraordinarias. Requiere Chrome o Edge de escritorio.
        </div>
      </div>
    </div>
  );
}
