import { describirVotacionEngrose } from './votacion.js';
import { fechaEnLetras } from './fechaLetras.js';

// El nombre visible sigue la convención "PLE/nnn" usada en toda la app, pero
// para el nombre de archivo real (OneDrive, ZIP, descarga) se quita la barra
// porque "/" no es válido en un nombre de archivo.
export function nombreArchivoEngrose(codigo) {
  return `ENGROSE_${(codigo || '').replace(/\//g, '')}.docx`;
}

export function nombreFirmante(asistente, conGrado) {
  if (!asistente) return conGrado ? '<<presidente>>' : '<<secretario>>';
  if (!conGrado) return asistente.nombre.toUpperCase();
  const gradoMap = {
    'Licenciatura': asistente.genero === 'femenino' ? 'LICENCIADA' : 'LICENCIADO',
    'Maestría': asistente.genero === 'femenino' ? 'MAESTRA' : 'MAESTRO',
    'Doctorado': asistente.genero === 'femenino' ? 'DOCTORA' : 'DOCTOR'
  };
  return `${gradoMap[asistente.grado] || ''} ${asistente.nombre}`.toUpperCase().replace(/\s+/g, ' ').trim();
}

export function generarTextoEngrose({ tipoVotacion, proyectoMeta = {}, asistentes = [], secretarioEjecutivo }) {
  const presidenteAsistente = asistentes.find(a => a.presidente);
  const descriptorVotacion = describirVotacionEngrose(tipoVotacion, asistentes);
  const tipoSesionTexto = (proyectoMeta.tipoSesion || 'ordinaria').toLowerCase();
  const fechaSesionTexto = fechaEnLetras(proyectoMeta.fecha) || '<<fecha>>';
  const parrafo = `Así lo aprobaron ${descriptorVotacion}las personas integrantes del Pleno del Órgano de Administración Judicial, en sesión ${tipoSesionTexto} de ${fechaSesionTexto}, firmando al calce el Presidente del Órgano de Administración Judicial y la persona Titular de la Secretaría Ejecutiva del Pleno, de conformidad con lo dispuesto en los artículos 91, 99, fracción VIII y 100, párrafo primero de la Ley Orgánica del Poder Judicial de la Federación.`;

  return {
    parrafo,
    firmaPresidente: {
      nombre: nombreFirmante(presidenteAsistente, true),
      cargo1: 'PRESIDENTE DEL ÓRGANO DE ADMINISTRACIÓN JUDICIAL',
      cargo2: 'DEL PODER JUDICIAL DE LA FEDERACIÓN'
    },
    firmaSecretario: {
      nombre: nombreFirmante(secretarioEjecutivo, false),
      cargo1: 'SECRETARIO EJECUTIVO DEL PLENO',
      cargo2: 'DEL ÓRGANO DE ADMINISTRACIÓN JUDICIAL'
    }
  };
}
