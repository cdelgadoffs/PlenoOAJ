import JSZip from 'jszip';
import { obtenerArchivo } from './archivosDB.js';
import { generarWordOrdenDia } from './word.js';

function nombreCarpetaSeguro(texto) {
  return (texto || 'Sin nombre').replace(/[\\/:*?"<>|]/g, '-').slice(0, 60).trim();
}

export async function generarZipArchivosSesion(secciones, proyectoMeta, listaCerrada) {
  const puntosConArchivos = secciones.filter(s => s.archivos && s.archivos.length > 0);
  if (puntosConArchivos.length === 0 && !(listaCerrada && secciones.length > 0)) {
    alert('No hay archivos adjuntos en esta sesión.');
    return;
  }

  const zip = new JSZip();

  if (listaCerrada && secciones.length > 0) {
    try {
      const { blob, nombreArchivo } = await generarWordOrdenDia(secciones, proyectoMeta);
      zip.folder('01-Aprobación del orden del día').file(nombreArchivo, blob);
    } catch (err) {
      console.error('No se pudo incluir el orden del día en el ZIP:', err);
    }
  }

  const offset = (listaCerrada && secciones.length > 0) ? 1 : 0;
  for (let i = 0; i < puntosConArchivos.length; i++) {
    const sec = puntosConArchivos[i];
    const numero = String(i + 1 + offset).padStart(2, '0');
    const resumen = sec.contenido ? sec.contenido.replace(/\*\*/g, '').slice(0, 35).trim() : 'Punto';
    const nombreCarpeta = nombreCarpetaSeguro(`${numero}-${resumen}`);
    const carpeta = zip.folder(nombreCarpeta);

    for (const archivo of sec.archivos) {
      if (archivo.adjuntadoEnSesion) continue;
      const blob = await obtenerArchivo(archivo.id);
      if (!blob) continue;
      const rutaDentro = archivo.rutaRelativa || archivo.nombre;
      carpeta.file(rutaDentro, blob);
    }
  }

  const contenidoZip = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(contenidoZip);
  const nombreArchivo = `Archivos - Sesión ${proyectoMeta.tipoSesion || ''} ${proyectoMeta.numeroSesion || ''}.zip`;
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}