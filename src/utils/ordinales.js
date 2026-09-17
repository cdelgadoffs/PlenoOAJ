export const ORDINALES = [
  'PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO',
  'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO'
];

export function obtenerPrefijo(indice, total) {
  if (total <= 1) return 'ÚNICO';
  return ORDINALES[indice] || `DÉCIMO ${ORDINALES[indice - 10] || ''}`.trim();
}

// Quita cualquier prefijo previo (con o sin bold) al inicio de un párrafo
export function limpiarPrefijo(parrafo) {
  return parrafo.replace(/^\*{0,2}(ÚNICO|PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|OCTAVO|NOVENO|DÉCIMO[A-ZÁÉÍÓÚ\s]*)\*{0,2}\.\s*/i, '');
}

// Recibe el texto crudo (ya sin prefijos, un párrafo por línea) y devuelve
// el texto completo con prefijos en bold aplicados por posición.
export function aplicarPrefijosAcuerdo(textoPlano) {
  const parrafos = textoPlano.split('\n');
  const total = parrafos.filter(p => p.trim() !== '').length;
  let indice = 0;
  return parrafos.map(p => {
    if (p.trim() === '') return p;
    const limpio = limpiarPrefijo(p).trimStart();
    const prefijo = obtenerPrefijo(indice, total);
    indice++;
    return `**${prefijo}.** ${limpio}`;
  }).join('\n');
}