import { guardarArchivo, eliminarArchivo } from './archivosDB.js';
import { WORD_MIME } from './wordPunto.js';
import { generarWordOrdenDia } from './word.js';

export async function adjuntarOrdenDelDiaAPunto1(secciones, proyectoMeta, actualizarPunto) {
  const punto1 = secciones.find(s => s.id === 'sec_fijo_1');
  if (!punto1) return null;

  const resultado = await generarWordOrdenDia(secciones, proyectoMeta);
  if (!resultado) return null;
  const { blob, nombreArchivo } = resultado;

  const anteriores = (punto1.archivos || []).filter(a => !a.esOrdenDelDia);
  const previos = (punto1.archivos || []).filter(a => a.esOrdenDelDia);
  previos.forEach(a => { eliminarArchivo(a.id).catch(() => {}); });

  const archivoId = 'arch_orden_' + Date.now();
  await guardarArchivo(archivoId, blob);
  actualizarPunto('sec_fijo_1', {
    archivos: [{ id: archivoId, nombre: nombreArchivo, tipo: WORD_MIME, autogenerado: true, esOrdenDelDia: true }, ...anteriores]
  });

  return { blob, nombreArchivo };
}
