import React, { useState, useEffect } from 'react';

const CATALOGO = {
  voto: [
    { valor: 0, etiqueta: 'por unanimidad' },
    { valor: 1, etiqueta: 'por mayoría de 4 votos', requiereQuorum: true },
    { valor: 2, etiqueta: 'por mayoría de 3 votos', requiereQuorum: true },
    { valor: 3, etiqueta: 'acuerda retirar' }
  ],
  votacion: [
    { valor: 0, etiqueta: 'votación económica' },
    { valor: 1, etiqueta: 'votación concurrente' }
  ],
  estado: [
    { valor: true, etiqueta: 'aprueba' },
    { valor: false, etiqueta: 'acuerda' }
  ]
};

// Mapeo de valores antiguos a los nuevos (para compatibilidad)
const MAPEO_ANTIGUO = {
  'Económica': { voto: 0, votacion: 0, estado: true },
  'Nominal': { voto: 0, votacion: 1, estado: true },
  'Cédula': { voto: 0, votacion: 1, estado: true }
};

function TipoVotacionSelector({ value, onChange }) {
  // Parsear el value (string JSON) o usar defaults
  const parseValue = (val) => {
    if (!val) return { voto: 0, votacion: 0, estado: true };
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed.voto === 'number' && typeof parsed.votacion === 'number' && typeof parsed.estado === 'boolean') {
        return parsed;
      }
      // Si falta estado, lo añadimos por defecto
      if (parsed && typeof parsed.voto === 'number' && typeof parsed.votacion === 'number') {
        return { ...parsed, estado: true };
      }
    } catch (e) {
      // Si no es JSON, puede ser un valor antiguo
      if (MAPEO_ANTIGUO[val]) {
        return MAPEO_ANTIGUO[val];
      }
    }
    return { voto: 0, votacion: 0, estado: true };
  };

  const [estado, setEstado] = useState(() => parseValue(value));

  // Actualizar estado interno si el value externo cambia
  useEffect(() => {
    const nuevo = parseValue(value);
    if (nuevo.voto !== estado.voto || nuevo.votacion !== estado.votacion || nuevo.estado !== estado.estado) {
      setEstado(nuevo);
    }
  }, [value]);

  const handleVotoChange = (e) => {
    const voto = parseInt(e.target.value, 10);
    const nuevoEstado = { ...estado, voto };
    setEstado(nuevoEstado);
    onChange(JSON.stringify(nuevoEstado));
  };

  const handleVotacionChange = (e) => {
    const votacion = parseInt(e.target.value, 10);
    const nuevoEstado = { ...estado, votacion };
    setEstado(nuevoEstado);
    onChange(JSON.stringify(nuevoEstado));
  };

  const toggleEstado = () => {
    const nuevoEstado = { ...estado, estado: !estado.estado };
    setEstado(nuevoEstado);
    onChange(JSON.stringify(nuevoEstado));
  };

  const opcionVoto = CATALOGO.voto.find(v => v.valor === estado.voto) || CATALOGO.voto[0];
  const requiereQuorum = opcionVoto.requiereQuorum || false;
  const esRetirar = estado.voto === 3;

  // Colores para el botón de estado
  const botonColor = estado.estado ? '#a5d6a7' : '#90caf9'; // verde suave / azul

  return (
    <div className="ter-field" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ flex: '1 1 30%' }}>
        <label className="ter-label">Voto</label>
        <select className="ter-select" value={estado.voto} onChange={handleVotoChange}>
          {CATALOGO.voto.map(op => (
            <option key={op.valor} value={op.valor}>
              {op.etiqueta}
            </option>
          ))}
        </select>
        {requiereQuorum && (
          <div style={{ fontSize: '12px', color: '#d32f2f', marginTop: '4px' }}>
            ⚠️ Requiere quórum
          </div>
        )}
        {esRetirar && (
          <div style={{ fontSize: '12px', color: '#1976d2', marginTop: '4px' }}>
            No aplica votación
          </div>
        )}
      </div>
      <div style={{ flex: '1 1 30%' }}>
        <label className="ter-label">Votación</label>
        <select className="ter-select" value={estado.votacion} onChange={handleVotacionChange} disabled={esRetirar}>
          {CATALOGO.votacion.map(op => (
            <option key={op.valor} value={op.valor}>
              {op.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div style={{ flex: '0 0 auto' }}>
        <label className="ter-label">Estado</label>
        <button
          className="btn-estado"
          style={{
            backgroundColor: botonColor,
            fontWeight: 'bold',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.2s, transform 0.1s',
            display: 'block',
            marginTop: '2px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          onClick={toggleEstado}
        >
          {estado.estado ? 'aprueba' : 'acuerda'}
        </button>
      </div>
    </div>
  );
}

export default TipoVotacionSelector;