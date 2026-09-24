import JSZip from 'jszip';
import { generarWordPunto } from './wordPunto.js';
import { nombreArchivoEngrose } from './textoEngrose.js';

// Genera un ZIP con el documento de engrose de cada punto, todos en la
// carpeta raíz del ZIP (sin subcarpetas), listos para repartir de una vez.
export async function generarZipEngroses(puntosConCodigo, proyectoMeta, asistentes, secretarioEjecutivo) {
  if (!puntosConCodigo || puntosConCodigo.length === 0) {
    alert('No hay engroses para descargar.');
    return;
  }

  const zip = new JSZip();
  const nombresUsados = new Set();

  for (const { sec, codigo } of puntosConCodigo) {
    const resultado = await generarWordPunto(sec, proyectoMeta, { engrose: { asistentes, secretarioEjecutivo } });
    if (!resultado) continue;
    let nombre = nombreArchivoEngrose(codigo);
    if (nombresUsados.has(nombre)) {
      nombre = nombre.replace(/\.docx$/, `_${sec.id}.docx`);
    }
    nombresUsados.add(nombre);
    zip.file(nombre, resultado.blob);
  }

  const contenidoZip = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(contenidoZip);
  const nombreArchivo = `Engroses - Sesión ${proyectoMeta.tipoSesion || ''} ${proyectoMeta.numeroSesion || ''}.zip`;
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
