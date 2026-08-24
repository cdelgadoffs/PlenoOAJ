import { useState } from 'react';
import { useProyecto } from '../context/ProyectoContext.jsx';

export default function Quorum({ onVolver }) {
  const { sesiones, sesionActivaFecha, agregarAsistente, eliminarAsistente, editarAsistente } = useProyecto();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [genero, setGenero] = useState('masculino');
  const [grado, setGrado] = useState('Licenciatura');

  const asistentes = (sesionActivaFecha && sesiones[sesionActivaFecha]?.asistentes) || [];

  function agregar() {
    if (!nombre.trim() || !email.trim()) { alert('Debes ingresar nombre y correo.'); return; }
    agregarAsistente({ nombre: nombre.trim(), email: email.trim(), genero, grado });
    setNombre(''); setEmail('');
  }

  function editar(idx) {
    const a = asistentes[idx];
    const nuevoNombre = prompt('Nombre completo:', a.nombre);
    if (nuevoNombre === null) return;
    const nuevoEmail = prompt('Correo electrónico:', a.email);
    if (nuevoEmail === null) return;
    const nuevoGenero = confirm('¿Es femenino? (Aceptar = Femenino, Cancelar = Masculino)') ? 'femenino' : 'masculino';
    const nuevoGrado = prompt('Grado académico (Licenciatura, Maestría, Doctorado):', a.grado);
    if (nuevoGrado === null) return;
    if (!['Licenciatura', 'Maestría', 'Doctorado'].includes(nuevoGrado)) { alert('Grado no válido. Se mantendrá el actual.'); return; }
    editarAsistente(idx, { nombre: nuevoNombre.trim() || a.nombre, email: nuevoEmail.trim() || a.email, genero: nuevoGenero, grado: nuevoGrado });
  }

  return (
    <div className="sb-nav nuevo-panel" id="panelQuorum">
      <button className="btn-volver-nuevo" id="btnVolverMenuQuorum" onClick={onVolver}>‹ Volver</button>
      <div className="email-field">
        <label className="email-label">Gestionar asistentes</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <input
              type="text" id="inputAsistenteNombre" placeholder="Nombre completo"
              style={{ flex: '2', minWidth: '120px', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }}
              value={nombre} onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
            />
            <select id="inputAsistenteGenero" style={{ flex: '1', minWidth: '80px', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }} value={genero} onChange={(e) => setGenero(e.target.value)}>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>
            <select id="inputAsistenteGrado" style={{ flex: '1', minWidth: '100px', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }} value={grado} onChange={(e) => setGrado(e.target.value)}>
              <option value="Licenciatura">Licenciatura</option>
              <option value="Maestría">Maestría</option>
              <option value="Doctorado">Doctorado</option>
            </select>
            <button id="btnAgregarAsistente" className="btn-add-invitado" style={{ flex: '0 0 auto' }} onClick={agregar}>+</button>
          </div>
          <input
            type="email" id="inputAsistenteEmail" placeholder="correo@ejemplo.com"
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12.5px' }}
            value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
          />
        </div>
        <div id="listaAsistentesPanel" className="email-invitados-lista" style={{ marginTop: '10px', maxHeight: '250px', overflowY: 'auto' }}>
          {asistentes.length === 0
            ? <span className="email-vacio">No hay asistentes registrados</span>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {asistentes.map((a, idx) => {
                  const generoLabel = a.genero === 'femenino' ? 'F' : 'M';
                  const gradoAbrev = a.grado === 'Licenciatura' ? 'Lic.' : a.grado === 'Maestría' ? 'Mtra.' : a.grado === 'Doctorado' ? 'Dra.' : '';
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2a2a2a', padding: '6px 12px', borderRadius: '4px', borderLeft: '3px solid #555' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '500', color: '#ddd' }}>{a.nombre}</span>
                        <span style={{ fontSize: '11px', color: '#aaa' }}>{a.email}</span>
                        <span style={{ fontSize: '11px', color: '#888' }}>{generoLabel} · {gradoAbrev || a.grado}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-edit-asistente" onClick={() => editar(idx)} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '3px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}>✎</button>
                        <button className="btn-eliminar-asistente" onClick={() => eliminarAsistente(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
      <div className="email-field">
        <label className="email-label">Info</label>
        <div style={{ fontSize: '11.5px', color: '#999', lineHeight: '1.5' }}>
          Los asistentes se utilizarán para registrar el quórum en la sesión previa. Género y grado académico se usarán en la redacción del acta.
        </div>
      </div>
    </div>
  );
}
