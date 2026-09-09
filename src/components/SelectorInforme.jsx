import { useState, useEffect } from 'react';

const OPCION_SIMPLE = 'El Pleno toma conocimiento del informe presentado.';

export default function SelectorInforme({ value, onChange }) {
  const esSimple = !value || value === OPCION_SIMPLE;
  const [opcion, setOpcion] = useState(esSimple ? 'simple' : 'extendido');
  const [complemento, setComplemento] = useState(
    !esSimple ? value.replace('El Pleno toma conocimiento de ', '').replace(/\.$/, '') : ''
  );

  useEffect(() => {
    if (!value) return;
    if (value === OPCION_SIMPLE) { setOpcion('simple'); }
    else { setOpcion('extendido'); setComplemento(value.replace('El Pleno toma conocimiento de ', '').replace(/\.$/, '')); }
  }, [value]);

  function seleccionarOpcion(op) {
    setOpcion(op);
    if (op === 'simple') {
      onChange(OPCION_SIMPLE);
    } else {
      onChange(complemento ? `El Pleno toma conocimiento de ${complemento}.` : '');
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          type="button"
          onClick={() => seleccionarOpcion('simple')}
          style={{
            flex: 1, padding: '8px', borderRadius: '4px', cursor: 'pointer',
            fontSize: '12.5px', fontWeight: '600', fontFamily: 'inherit',
            background: opcion === 'simple' ? '#1a1a1a' : '#f0f0f0',
            color: opcion === 'simple' ? '#fff' : '#555',
            border: '1px solid ' + (opcion === 'simple' ? '#1a1a1a' : '#ccc')
          }}
        >
          Informe presentado
        </button>
        <button
          type="button"
          onClick={() => seleccionarOpcion('extendido')}
          style={{
            flex: 1, padding: '8px', borderRadius: '4px', cursor: 'pointer',
            fontSize: '12.5px', fontWeight: '600', fontFamily: 'inherit',
            background: opcion === 'extendido' ? '#1a1a1a' : '#f0f0f0',
            color: opcion === 'extendido' ? '#fff' : '#555',
            border: '1px solid ' + (opcion === 'extendido' ? '#1a1a1a' : '#ccc')
          }}
        >
          Toma conocimiento de...
        </button>
      </div>
      {opcion === 'extendido' && (
        <textarea
          className="precision-textarea"
          value={complemento}
          onChange={manejarComplemento}
          placeholder="...las acciones realizadas en materia de..."
          style={{ width: '100%', marginTop: '4px' }}
        />
      )}
      {value && (
        <div className="votacion-resultado" style={{ marginTop: '8px' }}>
          {value}
        </div>
      )}
    </div>
  );
}