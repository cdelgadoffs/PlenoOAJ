import React from 'react';

const NOMBRES_PROPIOS = [
  'Pleno', 'DGEJ', 'DEGETD', 'DGTI', 'DGJJ', 'DGIPDI', 'DGRH',
  'Administración', 'Adscripción',
  'Órgano de Administración Judicial',
  'Poder Judicial de la Federación',
  'Coordinación de Seguridad'
];

// Títulos que preceden un nombre propio de persona; se amplía esta lista según se necesite.
const TITULOS_PERSONA = ['Magistrado', 'Magistrada', 'Licenciado', 'Licenciada', 'Juez', 'Jueza'];

function capitalizarOracion(oracion) {
  const trimmed = oracion.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

const LETRA = 'A-Za-zÀ-ÖØ-öø-ÿ';

function restaurarNombresPropios(texto) {
  let resultado = texto;
  NOMBRES_PROPIOS.forEach(nombre => {
    const regex = new RegExp(`(?<![${LETRA}])${nombre}(?![${LETRA}])`, 'gi');
    resultado = resultado.replace(regex, nombre);
  });
  return resultado;
}

// Capitaliza el título + el nombre propio que le sigue, hasta la próxima coma/punto/punto y coma.
function capitalizarTitulosPersona(texto) {
  if (!texto || TITULOS_PERSONA.length === 0) return texto;
  const patron = new RegExp(`(?<![${LETRA}])(${TITULOS_PERSONA.join('|')})(?![${LETRA}])\\s+([^,.;:]+)`, 'gi');
  return texto.replace(patron, (_, titulo, nombre) => {
    const tituloCap = titulo.charAt(0).toUpperCase() + titulo.slice(1).toLowerCase();
    const nombreCap = nombre.trim().split(/\s+/)
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
      .join(' ');
    return `${tituloCap} ${nombreCap}`;
  });
}

// Frases disparadoras: lo que sigue es un nombre de institución (se detiene en la primera coma/punto).
const DISPARADORES_INSTITUCION = ['adscrito al', 'adscrita al', 'adscrito a la', 'adscrita a la'];
// Frases disparadoras: lo que sigue es un lugar (puede incluir comas, ej. "Culiacán, Sinaloa"; se detiene en punto).
const DISPARADORES_LUGAR = ['residencia en'];

// Palabras conectoras que permanecen en minúscula dentro de una frase capitalizada (excepto si son la primera palabra).
const CONECTORES_MINUSCULA = ['de', 'del', 'la', 'el', 'en', 'al', 'y', 'los', 'las'];

function tituloConConectores(fragmento) {
  return fragmento.trim().split(/\s+/).map((palabra, i) => {
    const base = palabra.toLowerCase();
    if (i > 0 && CONECTORES_MINUSCULA.includes(base)) return base;
    return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
  }).join(' ');
}

// Capitaliza el fragmento que sigue a una frase disparadora (la frase disparadora en sí no se modifica).
function capitalizarTrasDisparadores(texto, disparadores, detenerEnComa) {
  if (!texto || disparadores.length === 0) return texto;
  const patronDisp = disparadores.map(d => d.replace(/\s+/g, '\\s+')).join('|');
  const clasePare = detenerEnComa ? '[^,.;:]+' : '[^.;:]+';
  const patron = new RegExp(`(?<![${LETRA}])(${patronDisp})(?![${LETRA}])\\s+(${clasePare})`, 'gi');
  return texto.replace(patron, (_, disparador, resto) => `${disparador} ${tituloConConectores(resto)}`);
}

export function normalizarTexto(textoOriginal) {
  if (!textoOriginal) return '';
  const oraciones = textoOriginal
    .split(/(?<=[.!?])\s+/)
    .map(capitalizarOracion)
    .join(' ');
  let resultado = restaurarNombresPropios(oraciones);
  resultado = capitalizarTitulosPersona(resultado);
  resultado = capitalizarTrasDisparadores(resultado, DISPARADORES_INSTITUCION, true);
  resultado = capitalizarTrasDisparadores(resultado, DISPARADORES_LUGAR, false);
  return resultado;
}
export function ocultarParaActa(texto) {
  if (!texto) return texto;
  return texto.replace(/\*\*(.+?)\*\*/g, (_, contenido) => contenido.replace(/\S/g, '*'));
}

export function renderConOcultos(texto) {
  if (!texto) return texto;
  const partes = texto.split(/(\*\*.+?\*\*)/g);
  return partes.map((parte, i) => {
    const match = parte.match(/^\*\*(.+)\*\*$/);
    if (match) {
      return React.createElement('span', { key: i, className: 'texto-oculto' }, match[1]);
    }
    return parte;
  });
}
export function tieneTextoOculto(texto) {
  if (!texto) return false;
  return /\*\*(.+?)\*\*/.test(texto);
}