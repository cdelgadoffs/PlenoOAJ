import { useState, useEffect } from 'react';
import DropdownSelect from './DropdownSelect.jsx';

const OPCION_SIMPLE = 'El Pleno toma conocimiento del informe presentado.';

export default function SelectorInforme({ value, onChange }) {
  const esSimple = !value || value === OPCION_SIMPLE || value.startsWith('{');
  const [opcion, setOpcion] = useState(esSimple ? 'simple' : 'extendido');
  const [complemento, setComplemento] = useState(
    !esSimple ? value.replace('El Pleno toma conocimiento de ', '').replace(/\.$/, '') : ''
  );

  useEffect(() => {
    if (!value || value.startsWith('{')) {
      setOpcion('simple');
      onChange(OPCION_SIMPLE);
      return;
    }
    if (value === OPCION_SIMPLE) {
      setOpcion('simple');
    } else {
      setOpcion('extendido');
      setComplemento(value.replace('El Pleno toma conocimiento de ', '').replace(/\.$/, ''));
    }
  }, []);

  function seleccionarOpcion(op) {
    setOpcion(op);
    if (op === 'simple') {
      setComplemento('');
      onChange(OPCION_SIMPLE);
    } else {
      onChange('');
    }
  }

  function manejarComplemento(e) {
    const texto = e.target.value;
    setComplemento(texto);
    onChange(texto ? `El Pleno toma conocimiento de ${texto}.` : '');
  }

  return (
    <div className="ter-field">
      <label className="ter-label">Conocimiento del Pleno</label>
      <DropdownSelect
        valorActual={opcion}
        etiquetaActual={opcion === 'simple' ? 'El Pleno toma conocimiento del informe presentado.' : 'El Pleno toma conocimiento de...'}
        opciones={[
          { id: 'simple', label: 'El Pleno toma conocimiento del informe presentado.' },
          { id: 'extendido', label: 'El Pleno toma conocimiento de...' }
        ]}
        onSeleccionar={seleccionarOpcion}
      />
      {opcion === 'extendido' && (
        <textarea
          className="precision-textarea"
          value={complemento}
          onChange={manejarComplemento}
          placeholder="...las acciones realizadas en materia de..."
          style={{ width: '100%', marginTop: '4px' }}
        />
      )}
    </div>
  );
}