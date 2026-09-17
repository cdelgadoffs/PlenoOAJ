import React from 'react';
import { obtenerNombresPropios } from './diccionarioPropios.js';

// Títulos que preceden un nombre propio de persona; se amplía esta lista según se necesite.
const TITULOS_PERSONA = ['Magistrado', 'Magistrada', 'Licenciado', 'Licenciada', 'Juez', 'Jueza'];

export function capitalizarPalabras(texto) {
  return texto.replace(/\S+/g, palabra =>
    palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase()
  );
}

function capitalizarOracion(oracion) {
  const trimmed = oracion.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

const LETRA = 'A-Za-zÀ-ÖØ-öø-ÿ';

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function restaurarNombresPropios(texto) {
  let resultado = texto;
  obtenerNombresPropios().forEach(nombre => {
    const escapado = escaparRegex(nombre);
    const regex = new RegExp(`(?<![${LETRA}])${escapado}(?![${LETRA}])`, 'gi');
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
  return texto.replace(/%%(.+?)%%/g, (_, contenido) => contenido.replace(/\S/g, '*'));
}

function procesarSegmentos(texto, prefijoKey) {
  const partes = texto.split(/(\*\*.+?\*\*|_.+?_|%%.+?%%)/g).filter(p => p !== '');
  return partes.map((parte, i) => {
    const key = `${prefijoKey}-${i}`;
    const negrita = parte.match(/^\*\*(.+)\*\*$/);
    if (negrita) {
      // Recursivo: puede haber itálica u oculto (%%...%%) dentro de la negrita.
      return React.createElement('strong', { key }, procesarSegmentos(negrita[1], key));
    }
    const italica = parte.match(/^_(.+)_$/);
    if (italica) {
      return React.createElement('em', { key }, procesarSegmentos(italica[1], key));
    }
    const oculto = parte.match(/^%%(.+)%%$/);
    if (oculto) {
      return React.createElement('span', { key, className: 'texto-oculto' }, oculto[1]);
    }
    return parte;
  });
}

const PREFIJO_LISTA = '##li##';

export function renderConOcultos(texto) {
  if (!texto) return texto;
  const lineas = texto.split('\n');
  const nodos = [];
  let itemsLista = [];
  let ultimaFueLista = false;

  function cerrarLista(key) {
    if (itemsLista.length === 0) return;
    nodos.push(React.createElement('ol', { key: `ol-${key}`, className: 'texto-lista-numerada' }, itemsLista));
    itemsLista = [];
    ultimaFueLista = true;
  }

  lineas.forEach((linea, li) => {
    if (linea.startsWith(PREFIJO_LISTA)) {
      itemsLista.push(React.createElement('li', { key: `li-${li}` }, procesarSegmentos(linea.slice(PREFIJO_LISTA.length), `l${li}`)));
      return;
    }
    cerrarLista(li);
    if (nodos.length > 0 && !ultimaFueLista) nodos.push(React.createElement('br', { key: `br-${li}` }));
    ultimaFueLista = false;
    nodos.push(...procesarSegmentos(linea, `l${li}`));
  });
  cerrarLista('fin');
  return nodos;
}
export function tieneTextoOculto(texto) {
  if (!texto) return false;
  return /%%(.+?)%%/.test(texto);
}

function escaparHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatearLineaInline(linea) {
  const escapado = escaparHtml(linea);
  const conNegritas = escapado.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const conItalica = conNegritas.replace(/_(.+?)_/g, '<em>$1</em>');
  return conItalica.replace(/%%(.+?)%%/g, '<span class="marca-oculta">$1</span>');
}

export function markersAHtml(texto) {
  const lineas = (texto || '').split('\n');
  let html = '';
  let enLista = false;
  lineas.forEach((linea, i) => {
    const esLi = linea.startsWith('##li##');
    const contenidoLinea = formatearLineaInline(esLi ? linea.slice(6) : linea);
    if (esLi) {
      if (!enLista) { html += '<ol>'; enLista = true; }
      html += `<li>${contenidoLinea}</li>`;
    } else {
      if (enLista) { html += '</ol>'; enLista = false; }
      else if (i > 0) html += '<br>';
      html += contenidoLinea;
    }
  });
  if (enLista) html += '</ol>';
  return html;
}

export function nodoAMarkers(nodo) {
  let resultado = '';
  nodo.childNodes.forEach(hijo => {
    if (hijo.nodeType === Node.TEXT_NODE) {
      resultado += hijo.textContent;
    } else if (hijo.nodeName === 'BR') {
      resultado += '\n';
    } else if (hijo.nodeName === 'STRONG' || hijo.nodeName === 'B') {
      const interno = nodoAMarkers(hijo);
      resultado += interno ? `**${interno}**` : '';
    } else if (hijo.nodeName === 'EM' || hijo.nodeName === 'I') {
      const interno = nodoAMarkers(hijo);
      resultado += interno ? `_${interno}_` : '';
    } else if (hijo.nodeName === 'SPAN' && hijo.classList.contains('marca-oculta')) {
      const interno = nodoAMarkers(hijo);
      resultado += interno ? `%%${interno}%%` : '';
    } else if (hijo.nodeName === 'OL' || hijo.nodeName === 'UL') {
      if (resultado && !resultado.endsWith('\n')) resultado += '\n';
      const items = Array.from(hijo.children).filter(c => c.nodeName === 'LI');
      resultado += items.map(li => '##li##' + nodoAMarkers(li)).join('\n');
    } else if (hijo.nodeName === 'DIV' || hijo.nodeName === 'P') {
      if (resultado && !resultado.endsWith('\n')) resultado += '\n';
      resultado += nodoAMarkers(hijo);
    } else {
      resultado += nodoAMarkers(hijo);
    }
  });
  return resultado;
}