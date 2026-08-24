import { useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { getTituloPunto } from '../utils/fechas.js';
import { obtenerPuntosFiltrados } from '../utils/puntos.js';

export default function SidebarDerecho() {
  const { vistaActual, terminoBusqueda, sidebarDerechoAbierto, setSidebarDerechoAbierto } = useUI();
  const { secciones, puntoSeleccionadoId, setPuntoSeleccionadoId, setSeccionActual } = useProyecto();
  const [filtroDependencia, setFiltroDependencia] = useState('');

  const soloEnProyecto = vistaActual === 'proyecto';
  const abierto = soloEnProyecto && sidebarDerechoAbierto;

  const dependencias = Array.from(new Set(
    secciones.filter(s => s.dependencia && s.dependencia.trim() !== '').map(s => s.dependencia.trim())
  )).sort((a, b) => a.localeCompare(b));

  let puntosBase = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  if (filtroDependencia) puntosBase = puntosBase.filter(sec => sec.dependencia === filtroDependencia);

  function seleccionar(sec) {
    setSeccionActual(sec.seccion);
    setPuntoSeleccionadoId(sec.id);
  }

  return (
    <>
      <div className={'sidebar-derecho' + (abierto ? ' open' : '')} id="sidebarDerecho">
        <div className="sb-header">
          <div className="header-top">
            <span className="sb-title">Esquema</span>
            <button className="btn-close-derecho" id="btnCerrarDerecho" onClick={() => setSidebarDerechoAbierto(false)}>✕</button>
          </div>
          <select
            id="filtroDependenciaEsquema" className="filtro-select"
            value={filtroDependencia}
            onChange={(e) => setFiltroDependencia(e.target.value)}
          >
            <option value="">Todas las dependencias</option>
            {dependencias.map(dep => <option key={dep} value={dep}>{dep}</option>)}
          </select>
        </div>
        <nav className="sb-nav" id="navEsquema">
          {puntosBase.length === 0 && (
            <div style={{ padding: '20px', color: '#999', fontSize: '13px' }}>
              {filtroActual ? 'No hay puntos con esa dependencia.' : 'No hay puntos para mostrar.'}
            </div>
          )}
          {puntosBase.map(sec => {
            const idxGlobal = secciones.indexOf(sec);
            const titulo = getTituloPunto(sec, idxGlobal);
            return (
              <div
                key={sec.id}
                className={'nav-item' + (sec.id === puntoSeleccionadoId ? ' active' : '')}
                onClick={() => seleccionar(sec)}
              >
                <span className="nav-dot"></span> {titulo}
                <span className={'badge-bloque' + (sec.anexo === true ? ' anexo-true' : '')}>{sec.seccion || 'Sin sección'}</span>
              </div>
            );
          })}
        </nav>
      </div>
      <button
        className={'btn-toggle-derecho' + (soloEnProyecto ? '' : ' hidden')}
        id="btnToggleDerecho"
        onClick={() => setSidebarDerechoAbierto(v => !v)}
      >Esquema</button>
    </>
  );
}
