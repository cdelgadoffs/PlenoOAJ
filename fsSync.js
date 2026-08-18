// ============================================================
// fsSync.js – Sincronización de sesiones con carpeta local (File System Access API)
// Archivos por sesión: ord-AAAA-MM-DD.json / ext-AAAA-MM-DD.json
// ============================================================

const FS_DB_NAME = 'ordenDiaFS';
const FS_DB_STORE = 'carpetas';

let fsCarpetaHandle = null;
let fsCarpetaNombre = null;

function fsAbrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, 1);
    req.onupgradeneeded = function() {
      req.result.createObjectStore(FS_DB_STORE);
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
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

function fsClaveUsuario() {
  const u = (typeof cuentaActiva !== 'undefined' && cuentaActiva && cuentaActiva.username)
    ? cuentaActiva.username
    : 'default';
  return 'carpeta_' + u;
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

function fsElementosDOM() {
  return {
    menuItemSync: document.getElementById('menuItemSync'),
    panelSync: document.getElementById('panelSync'),
    btnVolverMenuSync: document.getElementById('btnVolverMenuSync'),
    syncStatus: document.getElementById('syncStatus'),
    btnVincularCarpeta: document.getElementById('btnVincularCarpeta'),
    btnDesvincularCarpeta: document.getElementById('btnDesvincularCarpeta')
  };
}

function fsActualizarUI() {
  const els = fsElementosDOM();
  if (!els.syncStatus) return;
  if (fsCarpetaHandle) {
    els.syncStatus.textContent = `Vinculada: ${fsCarpetaNombre}`;
    els.syncStatus.className = 'email-status ok';
    if (els.btnDesvincularCarpeta) els.btnDesvincularCarpeta.style.display = 'block';
  } else if (fsCarpetaNombre) {
    els.syncStatus.textContent = `${fsCarpetaNombre}`;
    els.syncStatus.className = 'email-status error';
    if (els.btnDesvincularCarpeta) els.btnDesvincularCarpeta.style.display = 'block';
  } else {
    els.syncStatus.textContent = 'Ninguna carpeta vinculada';
    els.syncStatus.className = 'email-status';
    if (els.btnDesvincularCarpeta) els.btnDesvincularCarpeta.style.display = 'none';
  }
}

async function fsRestaurarCarpeta() {
  if (!('showDirectoryPicker' in window)) return;
  try {
    const clave = fsClaveUsuario();
    const handle = await fsObtenerHandle(clave);
    if (!handle) return;
    const permitido = await handle.queryPermission({ mode: 'readwrite' });
    if (permitido === 'granted') {
      fsCarpetaHandle = handle;
      fsCarpetaNombre = handle.name;
      fsActualizarUI();
      await fsSincronizarTodasLasSesiones();
    } else {
      fsCarpetaHandle = null;
      fsCarpetaNombre = handle.name + ' (toca "Seleccionar carpeta" para reconectar)';
      fsActualizarUI();
    }
  } catch (err) {
    console.error('No se pudo restaurar la carpeta local:', err);
  }
}

async function fsVincularCarpeta() {
  if (!('showDirectoryPicker' in window)) {
    alert('Tu navegador no soporta la vinculación de carpetas locales. Usa Chrome o Edge de escritorio.');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const ok = await fsVerificarPermiso(handle, 'readwrite');
    if (!ok) {
      alert('No se otorgaron permisos de escritura sobre la carpeta.');
      return;
    }
    fsCarpetaHandle = handle;
    fsCarpetaNombre = handle.name;
    await fsGuardarHandle(fsClaveUsuario(), handle);
    fsActualizarUI();
    await fsSincronizarTodasLasSesiones();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error al vincular carpeta:', err);
      alert('No se pudo vincular la carpeta.');
    }
  }
}

async function fsDesvincularCarpeta() {
  fsCarpetaHandle = null;
  fsCarpetaNombre = null;
  await fsEliminarHandle(fsClaveUsuario());
  fsActualizarUI();
}

function fsNombreArchivo(fecha, tipoSesion) {
  const prefijo = tipoSesion === 'Extraordinaria' ? 'ext' : 'ord';
  return `${prefijo}-${fecha}.json`;
}

async function fsEscribirArchivo(nombre, datos) {
  if (!fsCarpetaHandle) return;
  try {
    const ok = await fsVerificarPermiso(fsCarpetaHandle, 'readwrite');
    if (!ok) return;
    const fileHandle = await fsCarpetaHandle.getFileHandle(nombre, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(datos, null, 2));
    await writable.close();
  } catch (err) {
    console.error(`No se pudo escribir el archivo ${nombre}:`, err);
  }
}

async function fsEliminarArchivo(nombre) {
  if (!fsCarpetaHandle) return;
  try {
    const ok = await fsVerificarPermiso(fsCarpetaHandle, 'readwrite');
    if (!ok) return;
    await fsCarpetaHandle.removeEntry(nombre);
  } catch (err) {
    // El archivo puede no existir; se ignora.
  }
}

async function fsSincronizarSesion(fecha) {
  if (!fsCarpetaHandle) return;
  if (!fecha || typeof sesiones === 'undefined' || !sesiones[fecha]) return;
  const sesion = sesiones[fecha];
  const nombre = fsNombreArchivo(fecha, sesion.tipoSesion);
  const datos = {
    fecha,
    tipoSesion: sesion.tipoSesion,
    numeroSesion: sesion.numeroSesion,
    secciones: sesion.secciones
  };
  await fsEscribirArchivo(nombre, datos);
}

async function fsSincronizarTodasLasSesiones() {
  if (!fsCarpetaHandle || typeof sesiones === 'undefined') return;
  const fechas = Object.keys(sesiones);
  for (const f of fechas) {
    await fsSincronizarSesion(f);
  }
}

async function fsEliminarSesionArchivo(fecha, tipoSesion) {
  if (!fsCarpetaHandle) return;
  const nombre = fsNombreArchivo(fecha, tipoSesion);
  await fsEliminarArchivo(nombre);
}

window.fsSync = {
  sincronizarSesion: fsSincronizarSesion,
  sincronizarTodas: fsSincronizarTodasLasSesiones,
  eliminarSesionArchivo: fsEliminarSesionArchivo
};

function fsInicializarEventos() {
  const els = fsElementosDOM();
  if (els.menuItemSync) {
    els.menuItemSync.addEventListener('click', function() {
      panelMenuNuevo.classList.add('hidden');
      els.panelSync.classList.remove('hidden');
      if (!sidebarNuevo.classList.contains('open')) {
        toggleNuevoSidebar(true);
      }
      fsActualizarUI();
    });
  }
  if (els.btnVolverMenuSync) {
    els.btnVolverMenuSync.addEventListener('click', function() {
      els.panelSync.classList.add('hidden');
      panelMenuNuevo.classList.remove('hidden');
    });
  }
  if (els.btnVincularCarpeta) {
    els.btnVincularCarpeta.addEventListener('click', fsVincularCarpeta);
  }
  if (els.btnDesvincularCarpeta) {
    els.btnDesvincularCarpeta.addEventListener('click', fsDesvincularCarpeta);
  }
}

const _iniciarAppOriginalFS = window.iniciarApp;
window.iniciarApp = function() {
  if (typeof _iniciarAppOriginalFS === 'function') _iniciarAppOriginalFS();
  fsInicializarEventos();
  fsRestaurarCarpeta();
};