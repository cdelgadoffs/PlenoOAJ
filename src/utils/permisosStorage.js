const PERMISOS_KEY = 'permisosUsuarios';

const PERMISOS_DEFECTO_MIEMBRO = {
  calendarizacion: false,
  email: false,
  sync: false,
  nuevoProyecto: false,
  editarPuntos: false,
  descargar: false
};

function leerTodos() {
  const data = localStorage.getItem(PERMISOS_KEY);
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}

function guardarTodos(mapa) {
  localStorage.setItem(PERMISOS_KEY, JSON.stringify(mapa));
}

function normalizarCorreo(correo) {
  return (correo || '').trim().toLowerCase();
}

// === API pública (firma estable, misma forma que tendrán las llamadas a backend) ===

export async function listarUsuarios() {
  return leerTodos();
}

export async function obtenerPermisos(correo) {
  const mapa = leerTodos();
  return mapa[normalizarCorreo(correo)] || null;
}

export async function guardarUsuario(correo, datos) {
  const clave = normalizarCorreo(correo);
  if (!clave) throw new Error('Correo inválido.');
  const mapa = leerTodos();
  mapa[clave] = {
    tipo: datos.tipo === 'invitado' ? 'invitado' : 'miembro',
    bloqueado: !!datos.bloqueado,
    permisos: datos.tipo === 'invitado'
      ? { ...PERMISOS_DEFECTO_MIEMBRO }
      : { ...PERMISOS_DEFECTO_MIEMBRO, ...(datos.permisos || {}) }
  };
  guardarTodos(mapa);
  return mapa[clave];
}

export async function eliminarUsuario(correo) {
  const clave = normalizarCorreo(correo);
  const mapa = leerTodos();
  delete mapa[clave];
  guardarTodos(mapa);
}

export { PERMISOS_DEFECTO_MIEMBRO };
