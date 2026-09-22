import React from 'react';
import { obtenerNombresPropios } from './diccionarioPropios.js';

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
  const partes = texto.split(/(\*\*.+?\*\*|_.+?_|%%.+?%%|##fs[\d.]+##.+?##\/fs##)/g).filter(p => p !== '');
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
    const tamano = parte.match(/^##fs([\d.]+)##(.+)##\/fs##$/);
    if (tamano) {
      return React.createElement('span', { key, style: { fontSize: `${tamano[1]}px` } }, procesarSegmentos(tamano[2], key));
    }
    return parte;
  });
}

const PREFIJO_LISTA = '##li##';
const PREFIJO_TABLA = '##tabla##';
const PREFIJO_ALINEAR = '##align-';

function extraerAlineacion(linea) {
  const match = linea.match(/^##align-([a-z]+)##/);
  if (!match) return null;
  return { align: match[1], resto: linea.slice(match[0].length) };
}

function decodificarTabla(linea) {
  try {
    return decodeURIComponent(escape(atob(linea.slice(PREFIJO_TABLA.length))));
  } catch {
    return '';
  }
}

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
    if (linea.startsWith(PREFIJO_TABLA)) {
      nodos.push(React.createElement('div', { key: `tabla-${li}`, dangerouslySetInnerHTML: { __html: decodificarTabla(linea) } }));
      ultimaFueLista = false;
      return;
    }
    const alineacion = extraerAlineacion(linea);
    if (alineacion) {
      nodos.push(React.createElement('div', { key: `align-${li}`, style: { textAlign: alineacion.align } }, procesarSegmentos(alineacion.resto, `l${li}`)));
      ultimaFueLista = false;
      return;
    }
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
  const conTamano = conItalica.replace(/##fs([\d.]+)##(.+?)##\/fs##/g, '<span style="font-size:$1px">$2</span>');
  return conTamano.replace(/%%(.+?)%%/g, '<span class="marca-oculta">$1</span>');
}

export function markersAHtml(texto) {
  const lineas = (texto || '').split('\n');
  let html = '';
  let itemsLista = [];
  function cerrarLista() {
    if (itemsLista.length === 0) return;
    html += `<ol>${itemsLista.join('')}</ol>`;
    itemsLista = [];
  }
  lineas.forEach(linea => {
    const esLi = linea.startsWith('##li##');
    const esTabla = linea.startsWith(PREFIJO_TABLA);
    if (esTabla) {
      cerrarLista();
      html += decodificarTabla(linea);
      return;
    }
    const alineacion = extraerAlineacion(linea);
    if (alineacion) {
      cerrarLista();
      html += `<p style="text-align:${alineacion.align}">${formatearLineaInline(alineacion.resto)}</p>`;
      return;
    }
    if (esLi) {
      itemsLista.push(`<li>${formatearLineaInline(linea.slice(6))}</li>`);
      return;
    }
    cerrarLista();
    html += `<p>${formatearLineaInline(linea)}</p>`;
  });
  cerrarLista();
  return html;
}

export function nodoAMarkers(nodo) {
  let resultado = '';
  nodo.childNodes.forEach(hijo => {
    if (hijo.nodeType === Node.TEXT_NODE) {
      resultado += hijo.textContent;
    } else if (hijo.nodeName === 'BR') {
      if (!hijo.classList.contains('ProseMirror-trailingBreak')) resultado += '\n';
    } else if (hijo.nodeName === 'STRONG' || hijo.nodeName === 'B') {
      const interno = nodoAMarkers(hijo);
      resultado += interno ? `**${interno}**` : '';
    } else if (hijo.nodeName === 'EM' || hijo.nodeName === 'I') {
      const interno = nodoAMarkers(hijo);
      resultado += interno ? `_${interno}_` : '';
    } else if (hijo.nodeName === 'SPAN' && hijo.classList.contains('marca-oculta')) {
      const interno = nodoAMarkers(hijo);
      resultado += interno ? `%%${interno}%%` : '';
    } else if (hijo.nodeName === 'SPAN' && hijo.style && hijo.style.fontSize) {
      const interno = nodoAMarkers(hijo);
      const px = parseFloat(hijo.style.fontSize);
      resultado += (interno && px) ? `##fs${px}##${interno}##/fs##` : interno;
    } else if (hijo.nodeName === 'TABLE') {
      if (resultado) resultado += '\n';
      resultado += PREFIJO_TABLA + btoa(unescape(encodeURIComponent(hijo.outerHTML)));
    } else if (hijo.nodeName === 'OL' || hijo.nodeName === 'UL') {
      if (resultado) resultado += '\n';
      const items = Array.from(hijo.children).filter(c => c.nodeName === 'LI');
      resultado += items.map(li => '##li##' + nodoAMarkers(li)).join('\n');
    } else if (hijo.nodeName === 'DIV' || hijo.nodeName === 'P') {
      if (resultado) resultado += '\n';
      const align = hijo.style && hijo.style.textAlign;
      const interno = nodoAMarkers(hijo);
      resultado += (align && align !== 'left' && align !== 'start' && interno.trim())
        ? `${PREFIJO_ALINEAR}${align}##${interno}`
        : interno;
    } else {
      resultado += nodoAMarkers(hijo);
    }
  });
  return resultado;
}