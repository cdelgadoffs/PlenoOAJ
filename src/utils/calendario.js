import { parsearFechaLocal, hoyLocalISO, sumarDias } from './fechas.js';

export function estaEnVacaciones(excepciones, fechaStr) {
  return excepciones.vacaciones.some(v => fechaStr >= v.inicio && fechaStr <= v.fin);
}
export function resolverAsueto(excepciones, fechaStr) {
  const a = excepciones.asuetos.find(a => a.fecha === fechaStr);
  return a ? a.destino : fechaStr;
}

export function esFechaSesionOrdinaria(fechaStr, diaSesion) {
  const fecha = parsearFechaLocal(fechaStr);
  if (!fecha) return false;
  return fecha.getDay() === diaSesion;
}

export function siguienteFechaSesion(desdeStr, diaSesion, excepciones) {
  let f = desdeStr;
  for (let i = 0; i < 21; i++) {
    const d = parsearFechaLocal(f);
    if (d.getDay() === diaSesion && !estaEnVacaciones(excepciones, f)) return f;
    f = sumarDias(f, 1);
  }
  return desdeStr;
}

// Genera (o completa) el calendario anual de sesiones ordinarias para un año.
// Devuelve un nuevo objeto `sesiones`.
export function generarCalendarioAnual(sesiones, diaSesion, excepciones, anioParam) {
  const anio = anioParam || new Date().getFullYear();
  const fechaInicio = new Date(anio, 0, 1);
  const diaSemanaInicio = fechaInicio.getDay();
  let diff = diaSesion - diaSemanaInicio;
  if (diff < 0) diff += 7;
  fechaInicio.setDate(fechaInicio.getDate() + diff);

  const fechas = [];
  while (fechaInicio.getFullYear() === anio) {
    const y = fechaInicio.getFullYear();
    const m = String(fechaInicio.getMonth() + 1).padStart(2, '0');
    const d = String(fechaInicio.getDate()).padStart(2, '0');
    const fechaStr = `${y}-${m}-${d}`;
    if (!estaEnVacaciones(excepciones, fechaStr)) {
      const destino = resolverAsueto(excepciones, fechaStr);
      if (!estaEnVacaciones(excepciones, destino)) fechas.push(destino);
    }
    fechaInicio.setDate(fechaInicio.getDate() + 7);
  }

  const nuevasSesiones = { ...sesiones };
  fechas.forEach(fecha => {
    if (!nuevasSesiones[fecha]) {
      nuevasSesiones[fecha] = { tipoSesion: 'Ordinaria', numeroSesion: 1, secciones: [] };
    } else {
      nuevasSesiones[fecha] = { ...nuevasSesiones[fecha], tipoSesion: 'Ordinaria' };
    }
  });
  return nuevasSesiones;
}

// Aplica vacaciones/asuetos, eliminando u opcionalmente reprogramando
// sesiones vacías. No toca la sesión activa.
export function aplicarExcepciones(sesiones, excepciones, sesionActivaFecha) {
  let nuevas = { ...sesiones };
  excepciones.vacaciones.forEach(v => {
    Object.keys(nuevas).forEach(f => {
      if (f < v.inicio || f > v.fin || f === sesionActivaFecha) return;
      const s = nuevas[f];
      const vacio = !s.secciones || !s.secciones.some(p => !p.fijo);
      if (vacio) delete nuevas[f];
    });
  });
  excepciones.asuetos.forEach(a => {
    const s = nuevas[a.fecha];
    if (!s || a.fecha === sesionActivaFecha) return;
    const vacio = !s.secciones || !s.secciones.some(p => !p.fijo);
    if (!vacio) return;
    delete nuevas[a.fecha];
    if (!nuevas[a.destino] && !estaEnVacaciones(excepciones, a.destino)) {
      nuevas[a.destino] = { tipoSesion: 'Ordinaria', numeroSesion: 1, secciones: [] };
    }
  });
  return nuevas;
}

// Elimina sesiones ordinarias huérfanas (sin contenido y fuera del día de
// sesión configurado) y extraordinarias vacías nunca abiertas.
export function limpiarSesionesInvalidas(sesiones, diaSesion, sesionActivaFecha) {
  const nuevas = { ...sesiones };
  Object.keys(nuevas).forEach(fecha => {
    const sesion = nuevas[fecha];
    if (!sesion || fecha === sesionActivaFecha) return;
    const sinAbrir = !sesion.secciones || sesion.secciones.length === 0;
    if (sesion.tipoSesion === 'Extraordinaria') {
      if (sinAbrir) delete nuevas[fecha];
      return;
    }
    const fechaObj = parsearFechaLocal(fecha);
    if (!fechaObj || fechaObj.getDay() === diaSesion) return;
    const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
    if (tieneContenido) return;
    delete nuevas[fecha];
  });
  return nuevas;
}

// Renumera sesiones consecutivas por año+tipo, dejando huecos en sesiones
// ordinarias pasadas sin contenido (no celebradas).
export function recalcularNumerosSesion(sesiones) {
  const hoy = hoyLocalISO();
  const porAnioTipo = {};
  const nuevas = { ...sesiones };

  Object.keys(nuevas).sort().forEach(f => {
    const sesion = nuevas[f];
    if (!sesion) return;
    const anio = f.substring(0, 4);
    const tipo = sesion.tipoSesion || 'Ordinaria';
    const clave = anio + '_' + tipo;
    const esPasada = f < hoy;
    const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
    const noCelebrada = esPasada && !tieneContenido;

    if (!porAnioTipo[clave]) porAnioTipo[clave] = 0;

    if (noCelebrada) {
      nuevas[f] = { ...sesion, numeroSesion: null };
    } else {
      porAnioTipo[clave] += 1;
      nuevas[f] = { ...sesion, numeroSesion: porAnioTipo[clave] };
    }
  });
  return nuevas;
}

export function obtenerProximaSesion(sesiones) {
  const hoy = hoyLocalISO();
  const fechas = Object.keys(sesiones).sort();
  for (const f of fechas) {
    if (f >= hoy) return f;
  }
  return null;
}

export function obtenerSesionesDelMes(sesiones, mesStr) {
  return Object.keys(sesiones).filter(f => f.startsWith(mesStr)).sort();
}
