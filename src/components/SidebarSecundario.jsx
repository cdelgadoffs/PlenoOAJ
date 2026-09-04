import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { SECCIONES_DEL_DOCUMENTO, obtenerPuntosFiltrados } from '../utils/puntos.js';
import { getTituloPunto } from '../utils/fechas.js';
import '../styles/SidebarSecundario.css';

export default function SidebarSecundario({ onAbrirCreacion }) {
  const { vistaActual, terminoBusqueda } = useUI();
  const {
    secciones, seccionActual, setSeccionActual, setPuntoSeleccionadoId,
    puntoPreviaSeleccionadoId, setPuntoPreviaSeleccionadoId, actualizarPunto
  } = useProyecto();

  if (vistaActual !== 'sesionPrevia') {
    return <aside className="sidebar-secundario hidden" id="sidebarSecundario"></aside>;
  }

  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  const idsFiltrados = new Set(puntosFiltrados.map(p => p.id));

  if (vistaActual === 'sesionPrevia') {
    if (secciones.length === 0) {
      return (
        <aside className="sidebar-secundario" id="sidebarSecundario">
          <div className="sb-header">
            <div className="sb-header-top">
              <div className="sb-badge" id="secBadgeLabel">Sesión en curso</div>
            </div>
            <div className="sb-subtitle" id="secSubtitle">0 puntos</div>
          </div>
          <nav className="sb-nav" id="navSecundario">
            <div style={{ padding: '16px', color: '#999', fontSize: '12px' }}>No hay puntos registrados.</div>
          </nav>
        </aside>
      );
    }
    const totalAprobados = puntosFiltrados.filter(s => s.aprobado === true).length;
    const todosAprobados = puntosFiltrados.length > 0 && puntosFiltrados.every(s => s.aprobado === true);
    return (
      <aside className="sidebar-secundario" id="sidebarSecundario">
        <div className="sb-header">
          <div className="sb-header-top">
            <div className="sb-badge" id="secBadgeLabel">Sesión en curso</div>
            <div className="sb-header-actions">
              <button
                className="btn-add" id="btnAprobarTodos" title="Marcar/desmarcar todos"
                onClick={() => puntosFiltrados.forEach(sec => actualizarPunto(sec.id, { aprobado: !todosAprobados }))}
              >&#8595;</button>
            </div>
          </div>
          <div className="sb-subtitle" id="secSubtitle">
            {terminoBusqueda ? `${totalAprobados} de ${puntosFiltrados.length} coinciden` : `${totalAprobados} de ${secciones.length} aprobados`}
          </div>
        </div>
        <nav className="sb-nav" id="navSecundario">
          {puntosFiltrados.map(sec => {
            const idxGlobal = secciones.indexOf(sec);
            const titulo = getTituloPunto(sec, idxGlobal);
            const seleccionado = sec.id === puntoPreviaSeleccionadoId;
            return (
              <div
                key={sec.id}
                className={'check-item' + (sec.aprobado ? ' aprobado' : '') + (seleccionado ? ' active' : '')}
                onClick={() => setPuntoPreviaSeleccionadoId(sec.id)}
              >
                <input
                  type="checkbox" checked={!!sec.aprobado}
                  onChange={(e) => {
                    actualizarPunto(sec.id, { aprobado: e.target.checked });
                    setPuntoPreviaSeleccionadoId(sec.id);
                  }}
                />
                <label>{titulo}</label>
              </div>
            );
          })}
        </nav>
      </aside>
    );
  }

  const totalFiltrados = puntosFiltrados.length;
  function seleccionarSeccion(sec, conteo) {
    if (conteo === 0 && terminoBusqueda) return;
    setSeccionActual(sec);
    const pts = secciones.filter(s => s.seccion === sec);
    setPuntoSeleccionadoId(pts.length > 0 ? pts[0].id : null);
  }

  return (
    <aside className="sidebar-secundario" id="sidebarSecundario">
      <div className="sb-header">
        <div className="sb-header-top">
          <div className="sb-badge" id="secBadgeLabel">Secciones</div>
          <div className="sb-header-actions">
            <button
              className="btn-add"
              id="btnAgregarSeccion"
              title="Crear nuevo punto"
              disabled={seccionActual === 'asuntos generales' || secciones.length === 0}
              onClick={onAbrirCreacion}
            >+</button>
          </div>
        </div>
        <div className="sb-subtitle" id="secSubtitle">
          {terminoBusqueda ? `${totalFiltrados} de ${secciones.length} coinciden` : `${SECCIONES_DEL_DOCUMENTO.length} secciones`}
        </div>
      </div>
      <nav className="sb-nav" id="navSecundario">
        {SECCIONES_DEL_DOCUMENTO.map(sec => {
          const puntosEnSeccion = secciones.filter(s => s.seccion === sec);
          const conteo = puntosEnSeccion.filter(p => idsFiltrados.has(p.id)).length;
          const oculto = conteo === 0 && terminoBusqueda;
          const nombre = sec.charAt(0).toUpperCase() + sec.slice(1);
          return (
            <div
              key={sec}
              className={'nav-item' + (sec === seccionActual ? ' active' : '') + (oculto ? ' disabled' : '')}
              style={oculto ? { display: 'none' } : undefined}
              data-seccion={sec}
              onClick={() => seleccionarSeccion(sec, conteo)}
            >
              <span className="nav-dot"></span>
              <span className="sec-nombre">{nombre}</span>
              <span className="sec-badge">{conteo}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}