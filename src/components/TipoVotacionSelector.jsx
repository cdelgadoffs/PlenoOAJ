import React, { useState, useEffect } from 'react';
import DropdownSelect from './DropdownSelect.jsx';
import '../styles/TipoVotacionSelector.css';

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

const MAPEO_ANTIGUO = {
  'Económica': { voto: 0, votacion: 0, estado: true, quorum: [] },
  'Nominal': { voto: 0, votacion: 1, estado: true, quorum: [] },
  'Cédula': { voto: 0, votacion: 1, estado: true, quorum: [] }
};

const NOMBRES_FICTICIOS = ['Persona 1', 'Persona 2', 'Persona 3', 'Persona 4', 'Persona 5'];

function TipoVotacionSelector({ value, onChange }) {
  const parseValue = (val) => {
    if (!val) return { voto: 0, votacion: 0, estado: true, quorum: [] };
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed.voto === 'number' && typeof parsed.votacion === 'number') {
        return {
          voto: parsed.voto,
          votacion: parsed.votacion,
          estado: typeof parsed.estado === 'boolean' ? parsed.estado : true,
          quorum: Array.isArray(parsed.quorum) ? parsed.quorum : []
        };
      }
    } catch (e) {
      if (MAPEO_ANTIGUO[val]) return MAPEO_ANTIGUO[val];
    }
    return { voto: 0, votacion: 0, estado: true, quorum: [] };
  };

  const [estado, setEstado] = useState(() => parseValue(value));

  useEffect(() => {
    const nuevo = parseValue(value);
    if (
      nuevo.voto !== estado.voto ||
      nuevo.votacion !== estado.votacion ||
      nuevo.estado !== estado.estado ||
      JSON.stringify(nuevo.quorum) !== JSON.stringify(estado.quorum)
    ) {
      setEstado(nuevo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emitir(nuevoEstado) {
    setEstado(nuevoEstado);
    onChange(JSON.stringify(nuevoEstado));
  }

  function handleVotoSeleccionado(valor) {
    // al cambiar el tipo de voto, reiniciamos el quórum seleccionado
    emitir({ ...estado, voto: valor, quorum: [] });
  }

  function toggleVotacion() {
    if (esRetirar) return;
    const nuevaVotacion = estado.votacion === 0 ? 1 : 0;
    emitir({ ...estado, votacion: nuevaVotacion });
  }

  function toggleEstado() {
    emitir({ ...estado, estado: !estado.estado });
  }

  function toggleQuorum(nombre) {
    const yaSeleccionado = estado.quorum.includes(nombre);
    if (yaSeleccionado) {
      emitir({ ...estado, quorum: estado.quorum.filter(n => n !== nombre) });
      return;
    }
    if (estado.quorum.length >= maxQuorum) return;
    emitir({ ...estado, quorum: [...estado.quorum, nombre] });
  }

  const opcionVoto = CATALOGO.voto.find(v => v.valor === estado.voto) || CATALOGO.voto[0];
  const requiereQuorum = opcionVoto.requiereQuorum || false;
  const esRetirar = estado.voto === 3;
  const maxQuorum = estado.voto === 1 ? 1 : (estado.voto === 2 ? 2 : 0);

  return (
    <div className="ter-field votacion-selector">
      <div className="campo-voto">
        <label className="ter-label">Voto</label>
        <DropdownSelect
          valorActual={estado.voto}
          etiquetaActual={opcionVoto.etiqueta}
          opciones={CATALOGO.voto.map(op => ({ id: op.valor, label: op.etiqueta }))}
          onSeleccionar={handleVotoSeleccionado}
        />
      </div>

      <div className="campo-voto">
        <label className="ter-label ter-label-invisible">Votación</label>
        {requiereQuorum ? (
          <span className={'badge-quorum-requerido' + (estado.quorum.length >= maxQuorum ? ' completo' : '')}>
            {estado.quorum.length >= maxQuorum
              ? estado.quorum.join(', ')
              : `Requiere ${maxQuorum} voto${maxQuorum === 1 ? '' : 's'}`}
          </span>
        ) : (
          <button
            type="button"
            className={'btn-votacion' + (esRetirar ? ' disabled' : (estado.votacion === 0 ? ' votacion-economica' : ' votacion-concurrente'))}
            disabled={esRetirar}
            onClick={toggleVotacion}
          >
            {esRetirar ? 'No aplica votación' : CATALOGO.votacion.find(v => v.valor === estado.votacion)?.etiqueta}
          </button>
        )}
      </div>

      <div className="campo-estado">
        <label className="ter-label ter-label-invisible">Estado</label>
        <button
          className={'btn-estado ' + (estado.estado ? 'estado-aprueba' : 'estado-acuerda')}
          onClick={toggleEstado}
        >
          {estado.estado ? 'aprueba' : 'acuerda'}
        </button>
      </div>

      {requiereQuorum && (
        <div className="quorum-lista-wrap">
          <label className="ter-label">
            Quórum ({estado.quorum.length}/{maxQuorum})
          </label>
          <div className="quorum-lista">
            {NOMBRES_FICTICIOS.map(nombre => {
              const marcado = estado.quorum.includes(nombre);
              const bloqueado = !marcado && estado.quorum.length >= maxQuorum;
              return (
                <label key={nombre} className={'quorum-item' + (bloqueado ? ' bloqueado' : '')}>
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={bloqueado}
                    onChange={() => toggleQuorum(nombre)}
                  />
                  {nombre}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TipoVotacionSelector;