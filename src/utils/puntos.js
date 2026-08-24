import { getTituloPunto } from './fechas.js';

export const SECCIONES_DEL_DOCUMENTO = [
  'aprobaciones',
  'proyectos de acuerdo',
  'licencias',
  'tomas de nota',
  'informes',
  'asuntos generales'
];

export function getInsertIndex(secciones, seccion) {
  if (seccion === 'asuntos generales') return secciones.length;
  let lastIndex = -1;
  for (let i = 0; i < secciones.length; i++) {
    if (secciones[i].seccion === seccion) lastIndex = i;
  }
  return lastIndex !== -1 ? lastIndex + 1 : secciones.length;
}

export function puntoCoincide(secciones, punto, termino) {
  if (!termino) return true;
  const term = termino.toLowerCase().trim();
  if (!term) return true;
  const idx = secciones.indexOf(punto);
  const titulo = getTituloPunto(punto, idx);
  const texto = (punto.contenido || '') + ' ' +
                (punto.dependencia || '') + ' ' +
                (punto.seccion || '') + ' ' +
                (punto.asunto || '') + ' ' +
                titulo;
  return texto.toLowerCase().includes(term);
}

export function obtenerPuntosFiltrados(secciones, terminoBusqueda) {
  if (!terminoBusqueda) return secciones.slice();
  return secciones.filter(p => puntoCoincide(secciones, p, terminoBusqueda));
}

function puntoFijoBase(id) {
  return {
    id,
    clasificacion: 'Pleno',
    fijo: true,
    anexo: false,
    voto: 'Pendiente',
    anotaciones: '',
    dependencia: 'Pleno',
    asunto: '',
    archivos: []
  };
}

// Extraído literalmente de asegurarPuntosFijos() en app.js (solo la parte
// de creación/normalización; el guardado se orquesta desde el Context).
export function conPuntosFijosAsegurados(seccionesEntrada) {
  let secciones = [...seccionesEntrada];
  const idsFijos = ['sec_fijo_1', 'sec_fijo_2', 'sec_fijo_3'];

  idsFijos.forEach(id => {
    if (!secciones.some(s => s.id === id)) {
      if (id === 'sec_fijo_1') {
        secciones = [{
          ...puntoFijoBase(id),
          contenido: 'Aprobación, en su caso, del orden del día.',
          seccion: 'aprobaciones',
          subbloque: 'Pleno',
          aprobado: false
        }, ...secciones];
      } else if (id === 'sec_fijo_2') {
        secciones = [
          ...secciones.slice(0, 1),
          { ...puntoFijoBase(id), contenido: '', seccion: 'aprobaciones', subbloque: 'Pleno', aprobado: true },
          ...secciones.slice(1)
        ];
      } else if (id === 'sec_fijo_3') {
        secciones = [...secciones, {
          ...puntoFijoBase(id),
          contenido: 'Asuntos generales.',
          seccion: 'asuntos generales',
          subbloque: 'Pleno',
          aprobado: false
        }];
      }
    } else {
      secciones = secciones.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          fijo: true,
          clasificacion: 'Pleno',
          dependencia: s.dependencia === undefined ? '' : s.dependencia,
          asunto: s.asunto === undefined ? '' : s.asunto,
          archivos: s.archivos === undefined ? [] : s.archivos,
          seccion: id === 'sec_fijo_3' ? 'asuntos generales' : 'aprobaciones',
          subbloque: 'Pleno'
        };
      });
    }
  });

  return reordenarAsuntosGenerales(secciones);
}

export function reordenarAsuntosGenerales(secciones) {
  const generales = secciones.filter(s => s.seccion === 'asuntos generales');
  const otros = secciones.filter(s => s.seccion !== 'asuntos generales');
  return [...otros, ...generales];
}

// Extraído literalmente de actualizarPunto2() en app.js.
export function conPunto2Actualizado(secciones, proyectoMeta, sesiones, calcularFechaAnterior, formatearFechaES) {
  const idx = secciones.findIndex(s => s.id === 'sec_fijo_2');
  if (idx === -1 || !proyectoMeta.fecha) return secciones;
  const fechaAnterior = calcularFechaAnterior(proyectoMeta.fecha, 7);
  if (!fechaAnterior) return secciones;

  const tipoActual = (proyectoMeta.tipoSesion || 'Ordinaria').toLowerCase();
  const actas = [`la sesión ${tipoActual} del ${formatearFechaES(fechaAnterior)}`];

  Object.keys(sesiones)
    .filter(f => sesiones[f].tipoSesion === 'Extraordinaria' && f > fechaAnterior && f < proyectoMeta.fecha)
    .sort()
    .forEach(f => actas.push(`la sesión extraordinaria del ${formatearFechaES(f)}`));

  const listado = actas.length === 1
    ? actas[0]
    : actas.slice(0, -1).join(', ') + ' y ' + actas[actas.length - 1];

  const nuevoContenido = `Aprobación, en su caso, del acta${actas.length > 1 ? 's' : ''} de ${listado}.`;

  return secciones.map((s, i) => i === idx ? {
    ...s,
    contenido: nuevoContenido,
    seccion: 'aprobaciones',
    clasificacion: 'Pleno',
    subbloque: 'Pleno'
  } : s);
}
