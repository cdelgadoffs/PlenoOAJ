import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { usePermisos } from '../hooks/usePermisos.js';
import { parsearFechaLocal, padNumber } from '../utils/fechas.js';
import { SECCIONES_DEL_DOCUMENTO, obtenerPuntosFiltrados } from '../utils/puntos.js';
import '../styles/SidebarPrincipal.css';
import BotonListaCerrada from './BotonListaCerrada.jsx';
import { generarWordOrdenDia } from '../utils/word.js';
import { obtenerProximaSesion } from '../utils/calendario.js';
import { generarWordActa } from '../utils/wordActa.js';
import { generarZipArchivosSesion } from '../utils/zipArchivos.js';
import { generarZipEngroses } from '../utils/zipEngroses.js';
import HorariosCelebracion from './HorariosCelebracion.jsx';
import IndicadorEnVivo from './IndicadorEnVivo.jsx';
import BotonTerminarSesion from './BotonTerminarSesion.jsx';

const VISTAS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'proyecto', label: 'Proyecto del orden del día', badge: true, id2: 'navProyecto', acordeon: true },
  { id: 'sesionPrevia', label: 'Celebrar sesión' },
  { id: 'actaSesion', label: 'Historial' }
];

const SECCIONES_VISIBLES = SECCIONES_DEL_DOCUMENTO.filter(sec => sec !== 'licencias');

export default function SidebarPrincipal({ onGenerarPDF, onAbrirCreacion, totalPuntos = 0 }) {
  const { vistaActual, setVistaActual, terminoBusqueda, sidebarTerciarioAbierto, archivosTemporales, eliminarArchivoTemporalFn, panelVistaCompleta, setPanelVistaCompleta, seccionEnVista, scrollASeccionFn } = useUI();
  const { proyectoMeta, secciones, seccionActual, setSeccionActual, setPuntoSeleccionadoId, sesiones, sesionActivaFecha, toggleAsistentePresente, asistentes, comenzarSesionCelebracion, finalizarSesionCelebracion, actualizarHoraInicioCelebracion, actualizarHoraFinCelebracion, ajustarNumerosDesde, restablecerSesionCelebracion, secretarioEjecutivo } = useProyecto();

  // ✅ Variables derivadas que se necesitan en los useState de abajo
  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  const numero = proyectoMeta.numeroSesion || 1;

  const horaInicioSesion = sesionActivaFecha ? sesiones[sesionActivaFecha]?.horaInicio : null;
  const horaFinSesion = sesionActivaFecha ? sesiones[sesionActivaFecha]?.horaFin : null;
  const sesionTerminada = sesionActivaFecha ? !!sesiones[sesionActivaFecha]?.terminada : false;
  const presentes = asistentes.filter(a => a.presente).length;
  const proximaSesionFecha = obtenerProximaSesion(sesiones);
  const esSesionProxima = sesionActivaFecha === proximaSesionFecha;
  const { esLector } = usePermisos();

  const [acordeonAbierto, setAcordeonAbierto] = useState(vistaActual === 'proyecto');
  const [generandoWord, setGenerandoWord] = useState(false);
  const [generandoActaQuorum, setGenerandoActaQuorum] = useState(false);
  const [generandoZip, setGenerandoZip] = useState(false);
  const [generandoZipEngroses, setGenerandoZipEngroses] = useState(false);
  const [modalNumeroAbierto, setModalNumeroAbierto] = useState(false);
  const [numeroEditado, setNumeroEditado] = useState(numero); // ✅ ahora `numero` ya existe

  const listaCerrada = sesionActivaFecha ? !!sesiones[sesionActivaFecha]?.listaCerrada : false;
  const sesionEnCurso = !!horaInicioSesion && !horaFinSesion;
  const sesionCelebrada = !!horaInicioSesion && !!horaFinSesion;
  const hayArchivos = secciones.some(s => s.archivos && s.archivos.length > 0) || (listaCerrada && secciones.length > 0);

  useEffect(() => {
    if (vistaActual === 'proyecto') setAcordeonAbierto(true);
    else setPanelVistaCompleta(false);
  }, [vistaActual]);

  // ⚠️ Estas dos líneas ya NO van aquí (se movieron arriba)
  // const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  // const numero = proyectoMeta.numeroSesion || 1;

  let fechaTexto = 'Fecha no definida';
  if (proyectoMeta.fecha) {
    const fechaObj = parsearFechaLocal(proyectoMeta.fecha);
    fechaTexto = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  const idsFiltrados = new Set(puntosFiltrados.map(p => p.id));
  const totalFiltrados = puntosFiltrados.length;

  function seleccionarVista(v) {
    if (sesionEnCurso && v.id !== 'sesionPrevia') return;
    if (v.id === 'sesionPrevia' && !listaCerrada && !sesionEnCurso) return;
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
    if (panelVistaCompleta) {
      if (scrollASeccionFn) scrollASeccionFn(sec);
      return;
    }
    setSeccionActual(sec);
    const pts = secciones.filter(s => s.seccion === sec);
    setPuntoSeleccionadoId(pts.length > 0 ? pts[0].id : null);
  }

  async function generarWord() {
    if (secciones.length === 0) return;
    setGenerandoWord(true);
    try {
      const { blob, nombreArchivo } = await generarWordOrdenDia(secciones, proyectoMeta);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      await generarWordActa(secciones, proyectoMeta, asistentes, sesiones[sesionActivaFecha]);
    } catch (err) {
      alert('No se pudo generar el acta: ' + err.message);
    } finally {
      setGenerandoActaQuorum(false);
    }
  }

  async function descargarZip() {
    setGenerandoZip(true);
    try {
      await generarZipArchivosSesion(secciones, proyectoMeta, listaCerrada);
    } catch (err) {
      alert('No se pudo generar el ZIP: ' + err.message);
    } finally {
      setGenerandoZip(false);
    }
  }

  async function descargarZipEngroses() {
    setGenerandoZipEngroses(true);
    try {
      const puntosConCodigo = secciones
        .map((sec, idx) => ({ sec, idx }))
        .filter(({ sec }) => !(sec.fijo && sec.seccion === 'asuntos generales'))
        .map(({ sec, idx }) => ({ sec, codigo: 'PLE/' + padNumber(idx + 1, 3) }));
      await generarZipEngroses(puntosConCodigo, proyectoMeta, asistentes, secretarioEjecutivo);
    } catch (err) {
      alert('No se pudo generar el ZIP de engroses: ' + err.message);
    } finally {
      setGenerandoZipEngroses(false);
    }
  }

  return (
    <aside className={'sidebar-principal' + ((vistaActual === 'sesionPrevia' || (vistaActual === 'inicio' && sesionCelebrada)) ? ' ancho-quorum' : '')} id="sidebarPrincipal">
      <div className="sb-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div className="sb-title" id="docTitleSidebar">Sesión {tipo} N° {numero}</div>
          {vistaActual === 'proyecto' && (
            <button
              className="btn-add"
              title={panelVistaCompleta ? 'Ver por sección' : 'Ver lista completa'}
              onClick={() => setPanelVistaCompleta(v => !v)}
            >
              <i className={panelVistaCompleta ? 'fas fa-list' : 'fas fa-layer-group'}></i>
            </button>
          )}
          {vistaActual === 'proyecto' && (
            <button
              className="btn-add"
              title="Editar número de sesión"
              onClick={() => { setNumeroEditado(numero); setModalNumeroAbierto(true); }}
            >
              <i className="fas fa-pen"></i>
            </button>
          )}
          {vistaActual === 'sesionPrevia' && !horaInicioSesion && (
            <span style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #1d4ed8', fontSize: '12px', fontWeight: '700', padding: '4px 16px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '3px' }}>
              Previa
            </span>
          )}
          {vistaActual === 'sesionPrevia' && horaFinSesion && (
            <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #15803d', fontSize: '12px', fontWeight: '700', padding: '4px 16px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '3px' }}>
              Celebrada
            </span>
          )}
        </div>
        <div className="sb-subtitle" id="docSubSidebar">{fechaTexto}</div>
      </div>

      <div className={'modal-overlay' + (modalNumeroAbierto ? ' active' : '')}>
        <div className="modal-content" style={{ maxWidth: '360px' }}>
          <h3>Editar número de sesión</h3>
          <label>Nuevo número para esta sesión ({tipo})</label>
          <input
            type="number"
            min={1}
            value={numeroEditado}
            onChange={(e) => setNumeroEditado(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '14px', marginBottom: '16px' }}
          />
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalNumeroAbierto(false)}>Cancelar</button>
            <button
              className="btn-confirm"
              onClick={() => {
                const nuevo = parseInt(numeroEditado, 10);
                if (!nuevo || nuevo < 1) { alert('Ingresa un número válido.'); return; }
                ajustarNumerosDesde(sesionActivaFecha, nuevo);
                setModalNumeroAbierto(false);
              }}
            >Guardar</button>
          </div>
        </div>
      </div>

      <nav className="sb-nav" id="navPrincipal" style={
        vistaActual === 'sesionPrevia' ? { flex: '0 0 10px', overflowY: 'visible' }
        : (vistaActual === 'inicio' && sesionCelebrada) ? { flex: '0 1 auto', overflowY: 'visible' }
        : undefined
      }>
        {VISTAS.map(v => {
          if (esLector && (v.id === 'inicio' || v.id === 'proyecto')) return null;
          if (v.id === 'sesionPrevia' && !esSesionProxima) return null;
          if (v.id === 'proyecto' && sesionTerminada) return null;
          const activo = vistaActual === v.id;
          const expandido = v.acordeon && activo && acordeonAbierto;
          const bloqueadoPorSesion = (sesionEnCurso && v.id !== 'sesionPrevia') || (v.id === 'sesionPrevia' && !listaCerrada && !sesionEnCurso);
          return (
            <div key={v.id}>
              <div
                className={'nav-item' + (activo ? ' active' : '') + (bloqueadoPorSesion ? ' disabled' : '')}
                data-vista={v.id}
                id={v.id2}
                onClick={() => seleccionarVista(v)}
              >
                <span className="nav-dot"></span>
                <span style={v.id === 'sesionPrevia' && sesionEnCurso ? { fontWeight: '700', color: '#349739', fontSize: '18px' } : undefined}>
                  {v.id === 'sesionPrevia'
                    ? (sesionEnCurso ? `Celebrando Sesión ${tipo} N°${numero}` : `Celebrar Sesión ${tipo} N°${numero}`)
                    : v.label}
                </span>
                {v.id === 'sesionPrevia' && sesionEnCurso && <IndicadorEnVivo />}
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
                    const puedeAgregar = sec !== 'aprobaciones' && secciones.length > 0 && (!listaCerrada || sec === 'asuntos generales');
                    return (
                      <div
                        key={sec}
                        className={'nav-subitem' + (sec === (panelVistaCompleta ? seccionEnVista : seccionActual) ? ' active' : '') + (oculto ? ' disabled' : '')}
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

        {sidebarTerciarioAbierto && (
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontWeight: 600, fontSize: '11px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 12px' }}>
              Archivos adjuntos ({archivosTemporales.length})
            </div>
            <nav className="sb-nav" style={{ padding: 0, maxHeight: '380px', overflowY: 'auto' }}>
              {archivosTemporales.length === 0 && (
                <div style={{ padding: '6px 0', color: '#999', fontSize: '12px' }}>Ningún archivo adjuntado</div>
              )}
              {archivosTemporales.map((a, idx) => (
                <div key={idx} className="nav-item" style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="nav-dot"></span>{a.nombre}
                  </span>
                  <span
                    style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', flexShrink: 0 }}
                    onClick={() => eliminarArchivoTemporalFn && eliminarArchivoTemporalFn(idx)}
                  >✕</span>
                </div>
              ))}
            </nav>
          </div>
        )}
      </nav>

      <div id="resumenClasificacion" style={{ display: (vistaActual === 'sesionPrevia') ? 'none' : 'block', padding: '12px 16px', borderTop: '1px solid #e0e0e0', fontSize: '12px', color: '#444', marginTop: (vistaActual === 'inicio' && sesionCelebrada) ? 0 : 'auto' }}>
        <div style={{ fontWeight: '600', marginBottom: '5px' }}>
          {listaCerrada ? 'Lista de puntos cerrada' : 'Lista de puntos abierta'} · {secciones.length} punto{secciones.length === 1 ? '' : 's'}
        </div>
        {vistaActual === 'proyecto' && !sidebarTerciarioAbierto && !horaFinSesion && <BotonListaCerrada />}
        {vistaActual === 'proyecto' && listaCerrada && !sidebarTerciarioAbierto && (
          <button
            className="btn-nuevo-proyecto"
            disabled={generandoWord || secciones.length === 0}
            onClick={generarWord}
          >
            {generandoWord ? 'Generando...' : 'Descargar orden del día'}
          </button>
        )}
      </div>

      {vistaActual === 'inicio' && sesionCelebrada && (
        <div style={{ padding: '12px 16px 24px', borderTop: '1px solid #e0e0e0' }}>
          <div style={{ padding: '14px', background: '#f1f9f1', borderRadius: '6px', border: '1px solid #a5d6a7', marginBottom: '10px' }}>
            <div style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a1a', marginBottom: '8px' }}>Sesión celebrada</div>
            <p style={{ fontSize: '13px', color: '#333', marginBottom: '12px' }}>
              <strong>Inicio:</strong> {new Date(horaInicioSesion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              <strong>Fin:</strong> {new Date(horaFinSesion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {hayArchivos && (
              <button
                className="btn-nuevo-proyecto"
                style={{ margin: '0 0 8px', width: '100%' }}
                disabled={generandoZip}
                onClick={descargarZip}
              >
                {generandoZip ? 'Generando ZIP...' : 'Descargar archivos de sesión'}
              </button>
            )}
            <button
              className="btn-nuevo-proyecto"
              style={{ margin: 0, width: '100%' }}
              disabled={generandoZipEngroses || secciones.length === 0}
              onClick={descargarZipEngroses}
            >
              {generandoZipEngroses ? 'Generando ZIP...' : 'Descargar engroses (ZIP)'}
            </button>
          </div>
          <button
            className="btn-nuevo-proyecto"
            style={{ margin: '0 0 8px', width: '100%' }}
            disabled={generandoWord || secciones.length === 0}
            onClick={generarWord}
          >
            {generandoWord ? 'Generando...' : 'Descargar orden del día'}
          </button>
          <button
            className="btn-nuevo-proyecto"
            style={{ margin: '0 0 8px', width: '100%' }}
            disabled={generandoActaQuorum || secciones.length === 0}
            onClick={generarActaDesdeQuorum}
          >
            {generandoActaQuorum ? 'Generando...' : 'Descargar acta de sesión'}
          </button>
          <button
            className="btn-nuevo-proyecto"
            style={{ margin: 0, width: '100%', background: 'transparent', color: '#888', border: '1px solid #ccc' }}
            onClick={restablecerSesionCelebracion}
          >
            Restablecer sesión
          </button>
        </div>
      )}

      <div id="quorumContainer" style={{ display: (vistaActual === 'sesionPrevia') ? 'flex' : 'none', flexDirection: 'column', flex: '1', minHeight: 0, padding: '18px 22px', borderTop: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>Quórum</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', color: presentes === asistentes.length && asistentes.length > 0 ? '#2e7d32' : '#888', fontWeight: '700' }}>
            {presentes} / {asistentes.length}
          </span>
        </div>
        <div id="quorumLista" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
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
                  disabled={!!horaFinSesion}
                  onChange={(e) => toggleAsistentePresente(idx, e.target.checked)}
                  style={{ width: '17px', height: '17px', flexShrink: 0, cursor: horaFinSesion ? 'default' : 'pointer' }}
                />
              </label>
            );
          })}
        </div>

        <HorariosCelebracion
          horaInicioSesion={horaInicioSesion}
          horaFinSesion={horaFinSesion}
          onCambiarInicio={actualizarHoraInicioCelebracion}
          onCambiarFin={actualizarHoraFinCelebracion}
        />

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {!horaInicioSesion && listaCerrada && (
            <button className="btn-nuevo-proyecto" style={{ margin: 0, width: '100%' }} onClick={comenzarSesionCelebracion}>
              Comenzar Sesión {tipo} N°{numero}
            </button>
          )}
          {!horaInicioSesion && !listaCerrada && (
            <div style={{ fontSize: '16px', color: '#b91c1c', textAlign: 'center', padding: '8px 4px' }}>
              Debes cerrar la lista de puntos antes de poder comenzar la sesión.
            </div>
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
          {horaFinSesion && <BotonTerminarSesion />}
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