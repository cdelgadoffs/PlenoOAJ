import { useEffect, useState } from 'react';
import { listarUsuarios, guardarUsuario, eliminarUsuario } from '../utils/permisosStorage.js';

const FLAGS = [
  { id: 'calendarizacion', label: 'Calendarización anual' },
  { id: 'email', label: 'Enviar correo' },
  { id: 'sync', label: 'Carpeta local (sync)' },
  { id: 'nuevoProyecto', label: 'Crear sesión extraordinaria' },
  { id: 'editarPuntos', label: 'Editar puntos' },
  { id: 'descargar', label: 'Descargar PDF/Word' }
];

const formularioVacio = { correo: '', tipo: 'miembro', bloqueado: false, permisos: {} };

export default function GestionUsuarios({ onVolver }) {
  const [usuarios, setUsuarios] = useState({});
  const [form, setForm] = useState(formularioVacio);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, []);

  function cargar() {
    setCargando(true);
    listarUsuarios().then(mapa => { setUsuarios(mapa); setCargando(false); });
  }

  function limpiarFormulario() {
    setForm(formularioVacio);
    setEditando(null);
  }

  function cargarEnFormulario(correo) {
    const u = usuarios[correo];
    if (!u) return;
    setForm({ correo, tipo: u.tipo, bloqueado: u.bloqueado, permisos: { ...u.permisos } });
    setEditando(correo);
  }

  function togglePermiso(id) {
    setForm(f => ({ ...f, permisos: { ...f.permisos, [id]: !f.permisos[id] } }));
  }

  async function guardar() {
    const correo = form.correo.trim().toLowerCase();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      alert('Ingresa un correo institucional válido.');
      return;
    }
    await guardarUsuario(correo, { tipo: form.tipo, bloqueado: form.bloqueado, permisos: form.permisos });
    limpiarFormulario();
    cargar();
  }

  async function eliminar(correo) {
    if (!confirm(`¿Quitar el acceso de ${correo}? Ya no podrá usar la aplicación hasta volver a registrarlo.`)) return;
    await eliminarUsuario(correo);
    if (editando === correo) limpiarFormulario();
    cargar();
  }

  async function toggleBloqueoRapido(correo) {
    const u = usuarios[correo];
    if (!u) return;
    await guardarUsuario(correo, { tipo: u.tipo, bloqueado: !u.bloqueado, permisos: u.permisos });
    cargar();
  }

  const correos = Object.keys(usuarios).sort();

  return (
    <div className="sb-nav nuevo-panel" id="panelGestionUsuarios">
      <button className="btn-volver-nuevo" id="btnVolverMenuUsuarios" onClick={onVolver}>Volver</button>

      <div className="email-field">
        <label className="email-label">{editando ? `Editando: ${editando}` : 'Registrar usuario'}</label>
        <input
          type="email"
          placeholder="correo@institucion.gob"
          className="ter-select"
          style={{ marginBottom: '8px' }}
          value={form.correo}
          disabled={!!editando}
          onChange={(e) => setForm(f => ({ ...f, correo: e.target.value }))}
        />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            className="btn-add-invitado"
            style={{ flex: 1, width: 'auto', background: form.tipo === 'miembro' ? '#fff' : '#2a2a2a', color: form.tipo === 'miembro' ? '#1a1a1a' : '#fff' }}
            onClick={() => setForm(f => ({ ...f, tipo: 'miembro' }))}
          >Miembro</button>
          <button
            type="button"
            className="btn-add-invitado"
            style={{ flex: 1, width: 'auto', background: form.tipo === 'invitado' ? '#fff' : '#2a2a2a', color: form.tipo === 'invitado' ? '#1a1a1a' : '#fff' }}
            onClick={() => setForm(f => ({ ...f, tipo: 'invitado' }))}
          >Invitado</button>
        </div>

        {form.tipo === 'miembro' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {FLAGS.map(fl => (
              <label key={fl.id} className="email-check-item" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form.permisos[fl.id]} onChange={() => togglePermiso(fl.id)} />
                {fl.label}
              </label>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '11.5px', color: '#999', marginBottom: '10px' }}>
            Invitado: solo lectura, sin descargas ni edición.
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#ddd', cursor: 'pointer', marginBottom: '12px' }}>
          <input type="checkbox" checked={form.bloqueado} onChange={(e) => setForm(f => ({ ...f, bloqueado: e.target.checked }))} />
          Acceso bloqueado
        </label>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-enviar-email" style={{ flex: 1 }} onClick={guardar}>{editando ? 'Guardar cambios' : 'Registrar'}</button>
          {editando && (
            <button className="btn-add-invitado" style={{ width: 'auto', padding: '0 14px' }} onClick={limpiarFormulario}>Cancelar</button>
          )}
        </div>
      </div>

      <div className="email-field">
        <label className="email-label">Usuarios registrados ({correos.length})</label>
        {cargando ? (
          <span className="email-vacio">Cargando...</span>
        ) : correos.length === 0 ? (
          <span className="email-vacio">Ningún usuario registrado</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {correos.map(correo => {
              const u = usuarios[correo];
              return (
                <div key={correo} style={{ background: '#2a2a2a', padding: '8px 12px', borderRadius: '6px', borderLeft: u.bloqueado ? '3px solid #ef4444' : '3px solid #4caf50', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', color: '#f0f0f0', fontWeight: '600', wordBreak: 'break-all' }}>{correo}</span>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => cargarEnFormulario(correo)} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '3px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => eliminar(correo)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '10.5px', color: '#ccc', background: '#3a3a3a', padding: '2px 8px', borderRadius: '10px', textTransform: 'capitalize' }}>{u.tipo}</span>
                    <span
                      onClick={() => toggleBloqueoRapido(correo)}
                      style={{ fontSize: '10.5px', cursor: 'pointer', padding: '2px 8px', borderRadius: '10px', background: u.bloqueado ? '#442222' : '#1e3a24', color: u.bloqueado ? '#ff8080' : '#7ed99a' }}
                    >
                      {u.bloqueado ? 'Bloqueado (toca para reactivar)' : 'Activo (toca para bloquear)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
