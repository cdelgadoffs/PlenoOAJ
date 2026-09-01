export const STORAGE_KEY = 'ordenDiaData';
export const PROYECTO_META_KEY = 'proyectoMeta';
export const SIDEBAR_DERECHO_KEY = 'sidebarDerechoOpen';
export const NUEVO_SIDEBAR_KEY = 'nuevoSidebarOpen';
export const SESIONES_KEY = 'sesiones';
export const DIA_SESION_KEY = 'diaSesion';
export const EXCEPCIONES_KEY = 'excepcionesCalendario';
export const ASISTENTES_KEY = 'asistentesQuorum';

function leerJSON(key, porDefecto) {
  const data = localStorage.getItem(key);
  if (!data) return porDefecto;
  try { return JSON.parse(data); } catch { return porDefecto; }
}
function guardarJSON(key, valor) {
  localStorage.setItem(key, JSON.stringify(valor));
}

export const cargarDesdeLocalStorage = () => leerJSON(STORAGE_KEY, null);
export const guardarEnLocalStorage = (secciones) => guardarJSON(STORAGE_KEY, secciones);

export const cargarProyectoMeta = () => leerJSON(PROYECTO_META_KEY, null);
export const guardarProyectoMeta = (meta) => guardarJSON(PROYECTO_META_KEY, meta);

export const cargarSesiones = () => leerJSON(SESIONES_KEY, {});
export const guardarSesiones = (sesiones) => guardarJSON(SESIONES_KEY, sesiones);

export const cargarAsistentes = () => leerJSON(ASISTENTES_KEY, []);
export const guardarAsistentes = (asistentes) => guardarJSON(ASISTENTES_KEY, asistentes);

export function cargarDiaSesion() {
  const data = localStorage.getItem(DIA_SESION_KEY);
  if (data) {
    const d = parseInt(data, 10);
    if (d >= 1 && d <= 5) return d;
  }
  return 2;
}
export const guardarDiaSesion = (dia) => localStorage.setItem(DIA_SESION_KEY, String(dia));

export function cargarExcepciones() {
  const parsed = leerJSON(EXCEPCIONES_KEY, { vacaciones: [], asuetos: [] });
  return { vacaciones: parsed.vacaciones || [], asuetos: parsed.asuetos || [] };
}
export const guardarExcepciones = (excepciones) => guardarJSON(EXCEPCIONES_KEY, excepciones);

export const cargarSidebarDerechoOpen = () => localStorage.getItem(SIDEBAR_DERECHO_KEY) === 'true';
export const guardarSidebarDerechoOpen = (v) => localStorage.setItem(SIDEBAR_DERECHO_KEY, v ? 'true' : 'false');

export const cargarNuevoSidebarOpen = () => localStorage.getItem(NUEVO_SIDEBAR_KEY) === 'true';
export const guardarNuevoSidebarOpen = (v) => localStorage.setItem(NUEVO_SIDEBAR_KEY, v ? 'true' : 'false');
