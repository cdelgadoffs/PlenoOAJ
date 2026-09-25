import { guardarArchivo, eliminarArchivo } from './archivosDB.js';
import { WORD_MIME } from './wordPunto.js';
import { generarWordActa } from './wordActa.js';

function sesionCelebrada(sesion) {
  return !!(sesion && sesion.horaInicio && sesion.horaFin);
}

export async function adjuntarActaDeSesionReferenciada(punto, sesiones, actualizarPunto) {
  const fechaRef = punto.fechaReferencia;
  const sesionRef = fechaRef ? sesiones[fechaRef] : null;
  const yaTiene = (punto.archivos || []).some(a => a.esActaReferencia);

  if (!sesionCelebrada(sesionRef)) {
    if (yaTiene) {
      const previos = (punto.archivos || []).filter(a => a.esActaReferencia);
      previos.forEach(a => { eliminarArchivo(a.id).catch(() => {}); });
      actualizarPunto(punto.id, { archivos: (punto.archivos || []).filter(a => !a.esActaReferencia) });
    }
    return null;
  }
  if (yaTiene) return null;

  const proyectoMetaRef = { tipoSesion: sesionRef.tipoSesion, numeroSesion: sesionRef.numeroSesion, fecha: fechaRef };
  const resultado = await generarWordActa(sesionRef.secciones || [], proyectoMetaRef, sesionRef.asistentes || [], sesionRef, { silencioso: true });
  if (!resultado) return null;
  const { blob, nombreArchivo } = resultado;

  const anteriores = (punto.archivos || []).filter(a => !a.esActaReferencia);
  const archivoId = 'arch_acta_ref_' + Date.now();
  await guardarArchivo(archivoId, blob);
  actualizarPunto(punto.id, {
    archivos: [{ id: archivoId, nombre: nombreArchivo, tipo: WORD_MIME, autogenerado: true, esActaReferencia: true }, ...anteriores]
  });

  return { blob, nombreArchivo };
}
