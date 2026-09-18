export const ORDINALES = [
  'PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO',
  'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO'
];

export function obtenerPrefijo(indice, total, sinUnico) {
  if (total <= 1) return sinUnico ? 'PRIMERO' : 'ÚNICO';
  return ORDINALES[indice] || `DÉCIMO ${ORDINALES[indice - 10] || ''}`.trim();
}

// Quita cualquier prefijo previo (con o sin bold) al inicio de un párrafo.
// aplicarPrefijosAcuerdo genera el prefijo como `**PRIMERO.** ` (el cierre
// de negrita "**" va DESPUÉS del punto, no antes), así que el "**" opcional
// debe poder matchear en cualquiera de los dos lados del punto. Con el
// "**" opcional solo antes del punto, el cierre real ("**" tras el punto)
// quedaba sin consumir y se acumulaba como texto suelto en cada re-render
// (p. ej. "**PRIMERO.** ** resto", visible como "** resto").
export function limpiarPrefijo(parrafo) {
  return parrafo.replace(/^\*{0,2}(ÚNICO|PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|OCTAVO|NOVENO|DÉCIMO[A-ZÁÉÍÓÚ\s]*)\*{0,2}\.\*{0,2}\s*/i, '');
}

export function aplicarPrefijosAcuerdo(textoPlano, sinUnico) {
  const parrafos = textoPlano.split('\n');
  // Las líneas de viñeta numérica manual (##li##) llevan su propia numeración
  // y no deben recibir el prefijo ordinal automático (PRIMERO/SEGUNDO/...).
  const total = parrafos.filter(p => p.trim() !== '' && !p.startsWith('##li##')).length;
  let indice = 0;
  return parrafos.map(p => {
    if (p.trim() === '' || p.startsWith('##li##')) return p;
    const limpio = limpiarPrefijo(p).trimStart();
    const prefijo = obtenerPrefijo(indice, total, sinUnico);
    indice++;
    return `**${prefijo}.** ${limpio}`;
  }).join('\n');
}