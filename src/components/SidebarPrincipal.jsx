import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { usePermisos } from '../hooks/usePermisos.js';
import { parsearFechaLocal } from '../utils/fechas.js';
import { SECCIONES_DEL_DOCUMENTO, obtenerPuntosFiltrados } from '../utils/puntos.js';
import '../styles/SidebarPrincipal.css';
import BotonListaCerrada from './BotonListaCerrada.jsx';
import { generarWordOrdenDia } from '../utils/word.js';
import { obtenerProximaSesion } from '../utils/calendario.js';
import { generarWordActa } from '../utils/wordActa.js';

const VISTAS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'proyecto', label: 'Proyecto del orden del día', badge: true, id2: 'navProyecto', acordeon: true },
  { id: 'sesionPrevia', label: 'Celebrar sesión' },
  { id: 'actaSesion', label: 'Historial' }
];

const SECCIONES_VISIBLES = SECCIONES_DEL_DOCUMENTO.filter(sec => sec !== 'licencias');

export default function SidebarPrincipal({ onGenerarPDF, onAbrirCreacion, totalPuntos = 0 }) {
  const { vistaActual, setVistaActual, terminoBusqueda } = useUI();
  const { proyectoMeta, secciones, seccionActual, setSeccionActual, setPuntoSeleccionadoId, sesiones, sesionActivaFecha, toggleAsistentePresente, asistentes, comenzarSesionCelebracion, finalizarSesionCelebracion, restablecerSesionCelebracion } = useProyecto();
  const horaInicioSesion = sesionActivaFecha ? sesiones[sesionActivaFecha]?.horaInicio : null;
  const horaFinSesion = sesionActivaFecha ? sesiones[sesionActivaFecha]?.horaFin : null;
  const presentes = asistentes.filter(a => a.presente).length;
  const proximaSesionFecha = obtenerProximaSesion(sesiones);
  const esSesionProxima = sesionActivaFecha === proximaSesionFecha;
  const { esLector } = usePermisos();
  const [acordeonAbierto, setAcordeonAbierto] = useState(vistaActual === 'proyecto');
  const [generandoWord, setGenerandoWord] = useState(false);
  const [generandoActaQuorum, setGenerandoActaQuorum] = useState(false);

  const listaCerrada = sesionActivaFecha ? !!sesiones[sesionActivaFecha]?.listaCerrada : false;

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

  async function generarWord() {
    if (secciones.length === 0) return;
    setGenerandoWord(true);
    try {
      await generarWordOrdenDia(secciones, proyectoMeta);
    } catch (err) {
      alert('No se pudo generar el documento Word: ' + err.message);
    } finally {
      setGenerandoWord(false);
    }
  }
    async function generarActaDesdeQuorum() {
    if (secciones.length === 0) { alert('No hay puntos para generar el acta.'); return; }
    setGenerandoActaQuorum(true);
    try {
      await generarWordActa(secciones, proyectoMeta);
    } catch (err) {
      alert('No se pudo generar el acta: ' + err.message);
    } finally {
      setGenerandoActaQuorum(false);
    }
  }

  return (
    <aside className={'sidebar-principal' + (vistaActual === 'sesionPrevia' ? ' ancho-quorum' : '')} id="sidebarPrincipal">
      <div className="sb-header">
        <div className="sb-title" id="docTitleSidebar">Sesión {tipo} N° {numero}</div>
        <div className="sb-subtitle" id="docSubSidebar">{fechaTexto}</div>
      </div>
      <nav className="sb-nav" id="navPrincipal" style={vistaActual === 'sesionPrevia' ? { flex: '0 0 10px', overflowY: 'visible' } : undefined}>
        {VISTAS.map(v => {
          if (esLector && (v.id === 'inicio' || v.id === 'proyecto')) return null;
          if (v.id === 'sesionPrevia' && !esSesionProxima) return null;
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
                <span>{v.id === 'sesionPrevia' ? `Celebrar Sesión ${tipo} N°${numero}` : v.label}</span>
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
                    const puedeAgregar = sec !== 'asuntos generales' && sec !== 'aprobaciones' && secciones.length > 0 && !listaCerrada;
                    return (
                      <div
                        key={sec}
                        className={'nav-subitem' + (sec === seccionActual ? ' active' : '') + (oculto ? ' disabled' : '')}
                        style={oculto ? { display: 'none' } : undefined}
                        data-seccion={sec}
                        onClick={(e) => { e.stopPropagation(); seleccionarSeccion(sec, conteo); }}
                      >
                        <span className="sec-nombre">{nombre}</span>
                        <span className="sec-badge">{conteo}</span>
                        {puedeAgregar && (
                          <button
                            className="btn-add-subitem"
                            title={`Agregar punto a ${nombre}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const pts = secciones.filter(s => s.seccion === sec);
                              setPuntoSeleccionadoId(pts.length > 0 ? pts[0].id : null);
                              onAbrirCreacion(sec);
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
        <div style={{ fontWeight: '600', marginBottom: '16px' }}>
          {listaCerrada ? 'Lista de puntos cerrada' : 'Lista de puntos abierta'} · {secciones.length} punto{secciones.length === 1 ? '' : 's'}
        </div>
        {vistaActual === 'proyecto' && <BotonListaCerrada />}
        {vistaActual === 'proyecto' && listaCerrada && (
          <button
            className="btn-nuevo-proyecto"
            disabled={generandoWord || secciones.length === 0}
            onClick={generarWord}
          >
            {generandoWord ? 'Generando...' : 'Descargar orden del día'}
          </button>
        )}
      </div>
      <div id="quorumContainer" style={{ display: (vistaActual === 'sesionPrevia') ? 'flex' : 'none', flexDirection: 'column', flex: '1', minHeight: 0, padding: '18px 22px', borderTop: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>Quórum</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', color: presentes === asistentes.length && asistentes.length > 0 ? '#2e7d32' : '#888', fontWeight: '700' }}>
            {presentes} / {asistentes.length}
          </span>
        </div>
        <div id="quorumLista" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minHeight: 0, overflowY: 'auto' }}>
          {asistentes.length === 0 && <span style={{ color: '#999', fontSize: '12px' }}>Sin asistentes registrados</span>}
          {asistentes.map((a, idx) => {
            const iniciales = (a.nombre || '').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
            return (
              <label
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  padding: '10px 12px', borderRadius: '8px',
                  background: a.presente ? '#f1f9f1' : '#fafafa',
                  border: '1px solid ' + (a.presente ? '#a5d6a7' : '#e5e5e5'),
                  transition: 'background 0.15s, border-color 0.15s'
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: a.presidente ? '#1a1a1a' : '#dbe5f5',
                  color: a.presidente ? '#fff' : '#3a5a8f',
                  fontSize: '12px', fontWeight: '700'
                }}>
                  {iniciales || '?'}
                </div>
                <div style={{ flex: '1', minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.nombre}{a.presidente ? ' · Presidente' : ''}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#999' }}>{a.grado}</div>
                </div>
                <input
                  type="checkbox"
                  checked={!!a.presente}
                  onChange={(e) => toggleAsistentePresente(idx, e.target.checked)}
                  style={{ width: '17px', height: '17px', flexShrink: 0, cursor: 'pointer' }}
                />
              </label>
            );
          })}
        </div>
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {horaInicioSesion && (
            <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#2e7d32', fontWeight: '600' }}>
              Comenzó a las {new Date(horaInicioSesion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {horaFinSesion && (
            <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#b91c1c', fontWeight: '600' }}>
              Finalizó a las {new Date(horaFinSesion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {!horaInicioSesion && (
            <button className="btn-nuevo-proyecto" style={{ margin: 0, width: '100%' }} onClick={comenzarSesionCelebracion}>
              Comenzar sesión
            </button>
          )}
          {horaFinSesion && (
            <button
              className="btn-nuevo-proyecto"
              style={{ margin: 0, width: '100%' }}
              disabled={generandoActaQuorum}
              onClick={generarActaDesdeQuorum}
            >
              {generandoActaQuorum ? 'Generando...' : `Descargar acta de Sesión ${tipo} N°${numero}`}
            </button>
          )}
          {horaInicioSesion && (
            <button
              className="btn-nuevo-proyecto"
              style={{ margin: 0, width: '100%', background: 'transparent', color: '#888', border: '1px solid #ccc' }}
              onClick={restablecerSesionCelebracion}
            >
              Restablecer sesión
            </button>
          )}
          {horaInicioSesion && !horaFinSesion && (
            <button className="btn-nuevo-proyecto" style={{ margin: 0, width: '100%', background: '#b91c1c' }} onClick={finalizarSesionCelebracion}>
              Finalizar sesión
            </button>
          )}
        </div>
      </div>
      {(vistaActual === 'proyecto' || vistaActual === 'actaSesion') && (
        <button className="btn-nuevo-proyecto" id="btnGenerarPDFSidebar" onClick={onGenerarPDF}>Generar PDF</button>
      )}
    </aside>
  );
}