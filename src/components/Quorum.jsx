import { useState } from 'react';
import { useProyecto } from '../context/ProyectoContext.jsx';

export default function Quorum({ onVolver }) {
  const { sesiones, sesionActivaFecha, agregarAsistente, eliminarAsistente, editarAsistente } = useProyecto();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [genero, setGenero] = useState('masculino');
  const [grado, setGrado] = useState('Licenciatura');
  const [presidente, setPresidente] = useState(false);
  const [editandoIdx, setEditandoIdx] = useState(null);

  const asistentes = (sesionActivaFecha && sesiones[sesionActivaFecha]?.asistentes) || [];
  const limiteAlcanzado = asistentes.length >= 5;
  const mostrarFormulario = !limiteAlcanzado || editandoIdx !== null;
  const hayPresidente = asistentes.some((a, idx) => a.presidente && idx !== editandoIdx);

  function limpiarFormulario() {
    setNombre(''); setEmail(''); setGenero('masculino'); setGrado('Licenciatura'); setPresidente(false);
    setEditandoIdx(null);
  }

  function agregar() {
    if (!nombre.trim() || !email.trim()) { alert('Debes ingresar nombre y correo.'); return; }
    if (editandoIdx !== null) {
      editarAsistente(editandoIdx, { nombre: nombre.trim(), email: email.trim(), genero, grado, presidente });
    } else {
      agregarAsistente({ nombre: nombre.trim(), email: email.trim(), genero, grado, presidente });
    }
    limpiarFormulario();
  }

  function editar(idx) {
    const a = asistentes[idx];
    setNombre(a.nombre);
    setEmail(a.email);
    setGenero(a.genero);
    setGrado(a.grado);
    setPresidente(!!a.presidente);
    setEditandoIdx(idx);
  }

  return (
    <div className="sb-nav nuevo-panel" id="panelQuorum">
      <button className="btn-volver-nuevo" id="btnVolverMenuQuorum" onClick={onVolver}>Volver</button>
      <div className="email-field">
        <label className="email-label">Gestionar asistentes</label>

        {mostrarFormulario && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text" id="inputAsistenteNombre" placeholder="Nombre completo"
                style={{ flex: '1', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }}
                value={nombre} onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
              />
              {!hayPresidente && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#ddd', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  <input type="checkbox" checked={presidente} onChange={(e) => setPresidente(e.target.checked)} />
                  Presidente
                </label>
              )}
            </div>
            <input
              type="email" id="inputAsistenteEmail" placeholder="correo@ejemplo.com"
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }}
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>Género</label>
                <select id="inputAsistenteGenero" style={{ width: '100%', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }} value={genero} onChange={(e) => setGenero(e.target.value)}>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </select>
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>Grado académico</label>
                <select id="inputAsistenteGrado" style={{ width: '100%', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }} value={grado} onChange={(e) => setGrado(e.target.value)}>
                  <option value="Licenciatura">Licenciatura</option>
                  <option value="Maestría">Maestría</option>
                  <option value="Doctorado">Doctorado</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                id="btnAgregarAsistente"
                onClick={agregar}
                style={{
                  flex: editandoIdx !== null ? '1 1 0' : '1',
                  minWidth: 0,
                  padding: '10px',
                  background: '#fff',
                  color: '#1a1a1a',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {editandoIdx !== null ? 'Guardar cambios' : 'Agregar asistente'}
              </button>
              {editandoIdx !== null && (
                <button
                  onClick={limpiarFormulario}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    padding: '10px',
                    background: 'transparent',
                    color: '#ccc',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        <div id="listaAsistentesPanel" className="email-invitados-lista" style={{ marginTop: '10px' }}>
          {asistentes.length === 0
            ? <span className="email-vacio">No hay asistentes registrados</span>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {asistentes.map((a, idx) => {
                  const generoLabel = a.genero === 'femenino' ? 'Femenino' : 'Masculino';
                  return (
                    <div key={idx} style={{ background: '#2a2a2a', padding: '10px 14px', borderRadius: '6px', borderLeft: a.presidente ? '3px solid #01992a' : '3px solid #555', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontWeight: '600', color: '#f0f0f0', fontSize: '13px' }}>
                          {a.nombre}{a.presidente ? ' · Presidente' : ''}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button className="btn-edit-asistente" onClick={() => editar(idx)} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '3px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>✎</button>
                          <button className="btn-eliminar-asistente" onClick={() => eliminarAsistente(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </div>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#aaa' }}>{a.email}</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ fontSize: '10.5px', color: '#ccc', background: '#3a3a3a', padding: '2px 8px', borderRadius: '10px' }}>{generoLabel}</span>
                        <span style={{ fontSize: '10.5px', color: '#ccc', background: '#3a3a3a', padding: '2px 8px', borderRadius: '10px' }}>{a.grado}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}