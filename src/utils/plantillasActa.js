// Plantillas del punto de acuerdo (visor flotante + Word) y las secciones
// que cada una trae precargadas por defecto. Centralizado aquí porque tanto
// VistaPreviaFlotante (para reaccionar a un cambio de plantilla) como
// SidebarTerciario (para que un punto nuevo ya nazca con sus secciones,
// sin depender de que un efecto llegue a dispararse) necesitan lo mismo.
export const PLANTILLAS = [
  { id: 'introduccion', label: 'Introducción' },
  { id: 'proyecto', label: 'Proyecto' }
];
export const PLANTILLA_POR_DEFECTO = PLANTILLAS[0].id;

// "Introducción": fundamento primero, luego secciones, proyecto y acuerdo.
// "Proyecto": el proyecto de punto de acuerdo va primero (sin el párrafo de
// fundamento), luego secciones y acuerdo.
export const SECCIONES_POR_DEFECTO = {
  introduccion: ['considerando'],
  proyecto: ['antecedente', 'considerando']
};

// Genera los bloques de acta por defecto de una plantilla, con ids únicos.
export function crearBloquesPorDefecto(plantilla) {
  const tipos = SECCIONES_POR_DEFECTO[plantilla] || [];
  const base = Date.now();
  return tipos.map((tipo, i) => ({ id: `blq_${base}_${i}`, tipo, texto: '' }));
}
