import React from 'react';

const NOMBRES_PROPIOS = [
  'Pleno', 'DGEJ', 'DEGETD', 'DGTI', 'DGJJ', 'DGIPDI', 'DGRH',
  'Administración', 'Adscripción'
];

function capitalizarOracion(oracion) {
  const trimmed = oracion.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function restaurarNombresPropios(texto) {
  let resultado = texto;
  NOMBRES_PROPIOS.forEach(nombre => {
    const regex = new RegExp(`\\b${nombre}\\b`, 'gi');
    resultado = resultado.replace(regex, nombre);
  });
  return resultado;
}
export function normalizarTexto(textoOriginal) {
  if (!textoOriginal) return '';
  const oraciones = textoOriginal
    .split(/(?<=[.!?])\s+/)
    .map(capitalizarOracion)
    .join(' ');
  return restaurarNombresPropios(oraciones);
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