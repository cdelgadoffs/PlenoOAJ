export const PLANTILLAS = [
  { id: 'introduccion', label: 'Introducción' },
  { id: 'proyecto', label: 'Proyecto' }
];
export const PLANTILLA_POR_DEFECTO = PLANTILLAS[0].id;

export const SECCIONES_POR_DEFECTO = {
  introduccion: ['considerando'],
  proyecto: ['antecedente', 'considerando']
};

export function crearBloquesPorDefecto(plantilla) {
  const tipos = SECCIONES_POR_DEFECTO[plantilla] || [];
  const base = Date.now();
  return tipos.map((tipo, i) => ({ id: `blq_${base}_${i}`, tipo, texto: '' }));
}
