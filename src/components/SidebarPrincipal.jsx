import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { usePermisos } from '../hooks/usePermisos.js';
import { parsearFechaLocal } from '../utils/fechas.js';
import { SECCIONES_DEL_DOCUMENTO, obtenerPuntosFiltrados } from '../utils/puntos.js';

const VISTAS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'proyecto', label: 'Proyecto del orden del día', badge: true, id2: 'navProyecto', acordeon: true },
  { id: 'sesionPrevia', label: 'Previa de sesión' },
  { id: 'actaSesion', label: 'Acta de sesión' }
];

const SECCIONES_VISIBLES = SECCIONES_DEL_DOCUMENTO.filter(sec => sec !== 'licencias');

export default function SidebarPrincipal({ onGenerarPDF, onAbrirCreacion, totalPuntos = 0 }) {
  const { vistaActual, setVistaActual, terminoBusqueda } = useUI();
  const { proyectoMeta, secciones, seccionActual, setSeccionActual, setPuntoSeleccionadoId } = useProyecto();
  const { esLector } = usePermisos();
  const [acordeonAbierto, setAcordeonAbierto] = useState(vistaActual === 'proyecto');

  useEffect(() => {
    if (vistaActual === 'proyecto') setAcordeonAbierto(true);
  }, [vistaActual]);

  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  const numero = proyectoMeta.numeroSesion || 1;
  let fechaTexto = 'Fecha no definida';
  if (proyectoMeta.fecha) {
    const fechaObj = parsearFechaLocal(proyectoMeta.fecha);
    fechaTexto = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  const idsFiltrados = new Set(puntosFiltrados.map(p => p.id));
  const totalFiltrados = puntosFiltrados.length;

  function seleccionarVista(v) {
    if (v.acordeon) {
      if (vistaActual === v.id) {
        setAcordeonAbierto(prev => !prev);
      } else {
        setVistaActual(v.id);
        setAcordeonAbierto(true);
      }
      return;
    }
    setVistaActual(v.id);
  }

  function seleccionarSeccion(sec, conteo) {
    if (conteo === 0 && terminoBusqueda) return;
    setSeccionActual(sec);
    const pts = secciones.filter(s => s.seccion === sec);
    setPuntoSeleccionadoId(pts.length > 0 ? pts[0].id : null);
  }

  return (
    <aside className="sidebar-principal" id="sidebarPrincipal">
      <div className="sb-header">
        <div className="sb-title" id="docTitleSidebar">Sesión {tipo} N° {numero}</div>
        <div className="sb-subtitle" id="docSubSidebar">{fechaTexto}</div>
      </div>
      <nav className="sb-nav" id="navPrincipal">
        {VISTAS.map(v => {
          if (esLector && (v.id === 'inicio' || v.id === 'proyecto')) return null;
          const activo = vistaActual === v.id;
          const expandido = v.acordeon && activo && acordeonAbierto;
          return (
            <div key={v.id}>
              <div
                className={'nav-item' + (activo ? ' active' : '')}
                data-vista={v.id}
                id={v.id2}
                onClick={() => seleccionarVista(v)}
              >
                <span className="nav-dot"></span>
                <span>{v.label}</span>
                {v.badge && <span className="badge-total" id="totalBadge">{totalPuntos}</span>}
                {v.acordeon && (
                  <span className={'nav-chevron' + (expandido ? ' expanded' : '')}>&#8250;</span>
                )}
              </div>
              {v.acordeon && expandido && (
                <div className="nav-acordeon">
                  
                  {SECCIONES_VISIBLES.map(sec => {
                    const puntosEnSeccion = secciones.filter(s => s.seccion === sec);
                    const conteo = puntosEnSeccion.filter(p => idsFiltrados.has(p.id)).length;
                    const oculto = conteo === 0 && terminoBusqueda;
                    const nombre = sec.charAt(0).toUpperCase() + sec.slice(1);
                    const puedeAgregar = sec !== 'asuntos generales' && sec !== 'aprobaciones' && secciones.length > 0;
                    return (
                      <div
                        key={sec}
                        className={'nav-subitem' + (sec === seccionActual ? ' active' : '') + (oculto ? ' disabled' : '')}
                        style={oculto ? { display: 'none' } : undefined}
                        data-seccion={sec}
                        onClick={(e) => { e.stopPropagation(); seleccionarSeccion(sec, conteo); }}
                      >
                        <span className="nav-dot"></span>
                        <span className="sec-nombre">{nombre}</span>
                        <span className="sec-badge">{conteo}</span>
                        {puedeAgregar && (
                          <button
                            className="btn-add-subitem"
                            title={`Agregar punto a ${nombre}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSeccionActual(sec);
                              const pts = secciones.filter(s => s.seccion === sec);
                              setPuntoSeleccionadoId(pts.length > 0 ? pts[0].id : null);
                              onAbrirCreacion();
                            }}
                          >+</button>
                        )}
                      </div>
                    );
                  })}
                  {terminoBusqueda && (
                    <div className="nav-acordeon-subtitle">{totalFiltrados} de {secciones.length} coinciden</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div id="resumenClasificacion" style={{ display: (vistaActual === 'sesionPrevia') ? 'none' : 'block', padding: '12px 16px', borderTop: '1px solid #e0e0e0', marginTop: 'auto', fontSize: '12px', color: '#444' }}>
        <div style={{ fontWeight: '600', marginBottom: '6px' }}>Clasificaciones</div>
        <div id="contenedorClasificaciones"></div>
      </div>
      <div id="quorumContainer" style={{ display: (vistaActual === 'sesionPrevia') ? 'block' : 'none', padding: '12px 16px', borderTop: '1px solid #e0e0e0', marginTop: 'auto', fontSize: '12px', color: '#444' }}>
        <div style={{ fontWeight: '600', marginBottom: '6px' }}>Quórum</div>
        <div id="quorumLista"></div>
      </div>
      {(vistaActual === 'proyecto' || vistaActual === 'actaSesion') && (
        <button className="btn-nuevo-proyecto" id="btnGenerarPDFSidebar" onClick={onGenerarPDF}>Generar PDF</button>
      )}
    </aside>
  );
}