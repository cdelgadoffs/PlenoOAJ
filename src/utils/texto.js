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