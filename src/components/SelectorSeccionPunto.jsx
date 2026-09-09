import DropdownSelect from './DropdownSelect.jsx';
import { SECCIONES_DEL_DOCUMENTO } from '../utils/puntos.js';

const SECCIONES_DISPONIBLES = SECCIONES_DEL_DOCUMENTO.filter(
  s => s !== 'aprobaciones' && s !== 'asuntos generales'
);

export default function SelectorSeccionPunto({ valor, onChange }) {
  const opciones = SECCIONES_DISPONIBLES.map(s => ({
    id: s,
    label: s.charAt(0).toUpperCase() + s.slice(1)
  }));

  const etiqueta = valor
    ? valor.charAt(0).toUpperCase() + valor.slice(1)
    : 'Seleccionar sección';

  return (
    <div className="ter-field">
      <label className="ter-label">Sección de destino</label>
      <DropdownSelect
        valorActual={valor}
        etiquetaActual={etiqueta}
        opciones={opciones}
        onSeleccionar={onChange}
      />
    </div>
  );
}