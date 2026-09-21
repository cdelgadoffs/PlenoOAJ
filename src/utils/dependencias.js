export const CATEGORIAS = [
  { id: 'pleno', label: 'Pleno' },
  { id: 'direcciones', label: 'Direcciones generales' },
  { id: 'comisiones', label: 'Comisiones' }
];

export const REMITENTES_POR_CATEGORIA = {
  pleno: ['Pleno'],
  direcciones: ['DGEJ', 'DEGETD', 'DGTI', 'DGJJ', 'DGIPDI', 'DGRH'],
  comisiones: ['Administración', 'Creación de nuevos órganos', 'Adscripción', 'Carrera judicial', 'Presupuesto']
};

export const TODAS_DEPENDENCIAS = [
  { id: 'Pleno', categoria: 'pleno' },
  { id: 'DGEJ', categoria: 'direcciones' }, { id: 'DEGETD', categoria: 'direcciones' },
  { id: 'DGTI', categoria: 'direcciones' }, { id: 'DGJJ', categoria: 'direcciones' },
  { id: 'DGIPDI', categoria: 'direcciones' }, { id: 'DGRH', categoria: 'direcciones' },
  { id: 'Administración', categoria: 'comisiones' }, { id: 'Creación de nuevos órganos', categoria: 'comisiones' },
  { id: 'Adscripción', categoria: 'comisiones' }, { id: 'Carrera judicial', categoria: 'comisiones' },
  { id: 'Presupuesto', categoria: 'comisiones' }
];
