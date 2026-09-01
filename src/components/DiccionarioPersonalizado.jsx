import { useState } from 'react';
import { obtenerNombresBase, obtenerNombresPersonalizados, agregarNombrePropio, eliminarNombrePropio } from '../utils/diccionarioPropios.js';

export default function DiccionarioPersonalizado({ onVolver }) {
  const [personalizados, setPersonalizados] = useState(() => obtenerNombresPersonalizados());
  const [nuevo, setNuevo] = useState('');
  const base = obtenerNombresBase();

  function refrescar() {
    setPersonalizados(obtenerNombresPersonalizados());
  }

  function agregar() {
    const resultado = agregarNombrePropio(nuevo);
    if (!resultado.ok) {
      alert(resultado.motivo === 'duplicado' ? 'Esa palabra ya está en el diccionario.' : 'Escribe una palabra válida.');
      return;
    }
    setNuevo('');
    refrescar();
  }

  function eliminar(nombre) {
    if (!confirm(`¿Quitar "${nombre}" del diccionario?`)) return;
    eliminarNombrePropio(nombre);
    refrescar();
  }

  return (
    <div className="sb-nav nuevo-panel" id="panelDiccionario">
      <button className="btn-volver-nuevo" id="btnVolverMenuDiccionario" onClick={onVolver}>‹ Volver</button>

      <div className="email-field">
        <label className="email-label">Añadir palabra o frase</label>
        <div className="email-invitado-input">
          <input
            type="text"
            placeholder="Ej. Sala Superior"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
          />
          <button className="btn-add-invitado" onClick={agregar}>+</button>
        </div>
      </div>

      <div className="email-field">
        <label className="email-label">Palabras añadidas ({personalizados.length})</label>
        <div className="email-invitados-lista">
          {personalizados.length === 0
            ? <span className="email-vacio">Ninguna palabra añadida todavía</span>
            : personalizados.map(nombre => (
              <span key={nombre} className="email-invitado-chip">
                {nombre} <span className="eliminar-invitado" onClick={() => eliminar(nombre)}>✕</span>
              </span>
            ))}
        </div>
      </div>

      <div className="email-field">
        <label className="email-label">Diccionario base (fijo)</label>
        <div style={{ fontSize: '11.5px', color: '#999', lineHeight: '1.6' }}>
          {base.join(', ')}
        </div>
      </div>
    </div>
  );
}