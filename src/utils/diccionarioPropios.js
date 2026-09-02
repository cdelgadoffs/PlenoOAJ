const KEY = 'diccionarioNombresPropios';

const BASE = [
  'Pleno', 'DGEJ', 'DEGETD', 'DGTI', 'DGJJ', 'DGIPDI', 'DGRH',
  'Administración', 'Adscripción',
  'Órgano de Administración Judicial',
  'Poder Judicial de la Federación',
  'Coordinación de Seguridad'
];

function leer() {
  try {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function escribir(lista) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}

export function obtenerNombresBase() {
  return BASE.slice();
}

export function obtenerNombresPersonalizados() {
  return leer();
}

// Lista completa usada por texto.js (base + personalizados)
export function obtenerNombresPropios() {
  const extra = leer();
  return Array.from(new Set([...BASE, ...extra]));
}

function emitirCambio() {
  window.dispatchEvent(new CustomEvent('diccionario-actualizado', { detail: { personalizados: leer() } }));
}

export function agregarNombrePropio(nombreCrudo) {
  const nombre = (nombreCrudo || '').trim();
  if (!nombre) return { ok: false, motivo: 'vacio' };
  const yaExiste = [...BASE, ...leer()].some(n => n.toLowerCase() === nombre.toLowerCase());
  if (yaExiste) return { ok: false, motivo: 'duplicado' };
  const extra = leer();
  extra.push(nombre);
  escribir(extra);
  emitirCambio();
  return { ok: true };
}

export function eliminarNombrePropio(nombre) {
  const extra = leer().filter(n => n !== nombre);
  escribir(extra);
  emitirCambio();
}
export function importarPersonalizados(lista) {
  if (!Array.isArray(lista)) return;
  const actuales = leer();
  const combinados = Array.from(new Set([...actuales, ...lista]));
  escribir(combinados);
  emitirCambio();
}