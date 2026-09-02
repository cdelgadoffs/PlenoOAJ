import mammoth from 'mammoth';
import { normalizarTexto } from './texto.js';

export function esArchivoWord(file) {
  return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         /\.docx$/i.test(file.name);
}

function esLineaTitulo(linea) {
  return /^[A-ZÁÉÍÓÚÑ\s]{4,}:?\s*$/.test(linea) && linea === linea.toUpperCase();
}

// Patrones por sección: cada uno detecta la línea que INICIA el párrafo buscado.
const PATRONES_PARRAFO_POR_SECCION = {
  'proyectos de acuerdo': /^(PROYECTO\s+DE\s+)?ACUERDO\s+DEL\s+PLENO\s+DEL\s+ÓRGANO\s+DE\s+ADMINISTRACIÓN\s+JUDICIAL\s+POR\s+EL\s+QUE\s+SE/i,
  'tomas de nota': /^PROYECTO\s+DE\s+ACUERDO\s+DEL\s+PLENO\s+DEL\s+ÓRGANO\s+DE\s+ADMINISTRACIÓN\s+JUDICIAL\s+POR\s+EL\s+QUE\s+SE\s+TOMA\s+NOTA/i,
  'informes': /^INFORME\s+QUE\s+RINDE/i
};

// Busca la línea que INICIA con el patrón (no requiere que sea línea de título aislada)
// y une las líneas siguientes hasta encontrar un renglón vacío.
function extraerParrafoQueInicia(textoCompleto, patronInicio) {
  const lineas = textoCompleto.split('\n').map(l => l.trim());

  let idxInicio = -1;
  for (let i = 0; i < lineas.length; i++) {
    if (lineas[i] && patronInicio.test(lineas[i])) { idxInicio = i; break; }
  }
  if (idxInicio === -1) return '';

  const partes = [lineas[idxInicio]];
  for (let i = idxInicio + 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) break;
    partes.push(linea);
  }
  return partes.join(' ').trim();
}

export function extraerParrafoAcuerdo(textoCompleto, seccion) {
  const patron = PATRONES_PARRAFO_POR_SECCION[seccion];
  if (!patron) return '';
  const parrafo = extraerParrafoQueInicia(textoCompleto, patron);
  if (!parrafo) return parrafo;
  if (seccion === 'proyectos de acuerdo' && !/^PROYECTO\s+DE\s+/i.test(parrafo)) {
    return `Proyecto de ${parrafo}`;
  }
  return parrafo;
}

function extraerSeccionPorTitulo(textoCompleto, patronTitulo, patronTituloConTexto, cortarEnBlanco, separador) {
  const lineas = textoCompleto.split('\n').map(l => l.trim());

  let idxTitulo = -1;
  let textoEnMismaLinea = '';

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) continue;
    const matchConTexto = linea.match(patronTituloConTexto);
    if (matchConTexto) {
      idxTitulo = i;
      textoEnMismaLinea = matchConTexto[2].trim();
      break;
    }
    if (patronTitulo.test(linea)) {
      idxTitulo = i;
      break;
    }
  }

  if (idxTitulo === -1) return '';

  const parrafos = [];
  if (textoEnMismaLinea) parrafos.push(textoEnMismaLinea);

  let actual = [];
  for (let i = idxTitulo + 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) {
      if (actual.length > 0) { parrafos.push(actual.join(' ')); actual = []; }
      if (cortarEnBlanco && parrafos.length > 0) break;
      continue;
    }
    if (esLineaTitulo(linea) && (parrafos.length > 0 || actual.length > 0)) break;
    actual.push(linea);
  }
  if (actual.length > 0) parrafos.push(actual.join(' '));

  return parrafos.join(separador).trim();
}

export function extraerTextoAcuerdos(textoCompleto) {
  return extraerSeccionPorTitulo(
    textoCompleto,
    /^ACUERDO\s*:?\s*$/i,
    /^ACUERDO\s*:\s*(.+)$/i,
    false,
    '\n\n'
  );
}

export async function extraerTextoWord(file, seccion) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const resultado = await mammoth.extractRawText({ arrayBuffer });
    const texto = resultado.value || '';
    const puntoAcuerdo = normalizarTexto(extraerParrafoAcuerdo(texto, seccion));
    const acuerdos = extraerTextoAcuerdos(texto);
    return { puntoAcuerdo, acuerdos };
  } catch (err) {
    console.error('Error al extraer texto del Word:', err);
    return { puntoAcuerdo: '', acuerdos: '' };
  }
}