import { useState } from 'react';
import { useProyecto } from '../context/ProyectoContext.jsx';

export default function SEPLE({ onVolver }) {
  const { secretarioEjecutivo, guardarSecretarioEjecutivo, eliminarSecretarioEjecutivo } = useProyecto();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [genero, setGenero] = useState('masculino');
  const [editando, setEditando] = useState(false);

  const mostrarFormulario = !secretarioEjecutivo || editando;

  function limpiarFormulario() {
    setNombre(''); setEmail(''); setGenero('masculino');
    setEditando(false);
  }

  function guardar() {
    if (!nombre.trim()) { alert('Debes ingresar el nombre.'); return; }
    guardarSecretarioEjecutivo({ nombre: nombre.trim(), email: email.trim(), genero });
    limpiarFormulario();
  }

  function editar() {
    setNombre(secretarioEjecutivo.nombre);
    setEmail(secretarioEjecutivo.email || '');
    setGenero(secretarioEjecutivo.genero || 'masculino');
    setEditando(true);
  }

  function eliminar() {
    if (!confirm('¿Quitar al Secretario Ejecutivo del Pleno?')) return;
    eliminarSecretarioEjecutivo();
    limpiarFormulario();
  }

  return (
    <div className="sb-nav nuevo-panel" id="panelSEPLE">
      <button className="btn-volver-nuevo" id="btnVolverMenuSEPLE" onClick={onVolver}>Volver</button>
      <div className="email-field">
        <label className="email-label">Secretario Ejecutivo del Pleno</label>
        <div style={{ fontSize: '11px', color: '#999', marginBottom: '10px' }}>
          No participa en el conteo de quórum ni de votos; solo puede haber uno registrado.
        </div>

        {mostrarFormulario && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text" id="inputSecretarioNombre" placeholder="Nombre completo"
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }}
              value={nombre} onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } }}
            />
            <input
              type="email" id="inputSecretarioEmail" placeholder="correo@ejemplo.com (opcional)"
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }}
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } }}
            />
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>Género</label>
              <select id="inputSecretarioGenero" style={{ width: '100%', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }} value={genero} onChange={(e) => setGenero(e.target.value)}>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                id="btnGuardarSecretario"
                onClick={guardar}
                style={{
                  flex: editando ? '1 1 0' : '1',
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
                {editando ? 'Guardar cambios' : 'Registrar Secretario'}
              </button>
              {editando && (
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

        {secretarioEjecutivo && !editando && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ background: '#2a2a2a', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontWeight: '600', color: '#f0f0f0', fontSize: '13px' }}>{secretarioEjecutivo.nombre}</span>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={editar} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '3px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>✎</button>
                  <button onClick={eliminar} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                </div>
              </div>
              {secretarioEjecutivo.email && <div style={{ fontSize: '11.5px', color: '#aaa' }}>{secretarioEjecutivo.email}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
