import { useEffect, useRef } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { getTituloPunto, formatearFechaES } from '../utils/fechas.js';
import { SECCIONES_DEL_DOCUMENTO, obtenerPuntosFiltrados, describirVotacion } from '../utils/puntos.js';
import '../styles/PanelPrincipal.css';
import VistaInicio from './VistaInicio.jsx';
import VistaHistorial from './VistaHistorial.jsx';
import { renderConOcultos } from '../utils/texto.js';
import TipoVotacionSelector from './TipoVotacionSelector.jsx';
import SelectorInforme from './SelectorInforme.jsx';
import ListaEngroses from './ListaEngroses.jsx';

const SECCIONES_VISIBLES = SECCIONES_DEL_DOCUMENTO.filter(sec => sec !== 'licencias');

function TarjetaPunto({ sec, idx, secciones, puedeSubir, puedeBajar, esSeleccionada, listaCerrada, onSeleccionar, onMover, onEditar, onEliminar, onToggleAnexo, onPreviewArchivo, onAdjuntar }) {
  const titulo = getTituloPunto(sec, idx, secciones);
  const esFijo = sec.fijo === true;
  const tieneArchivos = sec.archivos && sec.archivos.length > 0;
  const numeroAnexo = idx + 1;
  const dependenciaMostrada = sec.dependencia || 'Pleno';

  return (
    <div className={'punto-tabla-wrap' + (esSeleccionada ? ' selected' : '')} data-id={sec.id} onClick={onSeleccionar}>
    <table className="punto-tabla">
      <colgroup>
        <col className="col-titulos" />
        <col className="col-contenido" />
        <col className="col-archivos" />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={3} className="punto-tabla-header">
            <span className={'punto-tabla-titulo' + (sec.confidencial ? ' confidencial' : '')}>{titulo}</span>
            <span className="punto-tabla-dependencia">{dependenciaMostrada}</span>
            <div className="punto-tabla-acciones" onClick={(e) => e.stopPropagation()}>
              <button className="btn-tabla-accion" title="Adjuntar archivo" onClick={() => onAdjuntar(sec.id)}>
                <i className="fas fa-paperclip"></i>
              </button>
              <button className="btn-tabla-accion" disabled={!puedeSubir} title="Mover arriba" onClick={() => onMover(sec.id, -1)}>▲</button>
              <button className="btn-tabla-accion" disabled={!puedeBajar} title="Mover abajo" onClick={() => onMover(sec.id, 1)}>▼</button>
              <button className="btn-tabla-accion" disabled={esFijo || listaCerrada} title="Editar punto" onClick={() => onEditar(sec.id)}>
                <i className="fas fa-pen"></i>
              </button>
              <button className="btn-tabla-accion btn-tabla-eliminar" disabled={esFijo || listaCerrada} title={esFijo ? 'Fijo' : 'Eliminar'} onClick={() => onEliminar(sec)}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="punto-tabla-fila-titulo">
            <span>Punto de acuerdo</span>
          </td>
          <td className="punto-tabla-contenido">
            {sec.contenido ? renderConOcultos(sec.contenido) : 'Sin contenido'}
          </td>
          <td className="punto-tabla-archivos" rowSpan={3}>
            {tieneArchivos ? (
              sec.archivos.map((a, i) => (
                <span key={i} className="archivo-item" onClick={(e) => { e.stopPropagation(); onPreviewArchivo(a); }}>{a.nombre}</span>
              ))
            ) : (
              <span className="punto-tabla-sin-archivos">Sin archivos</span>
            )}
          </td>
        </tr>
        {(sec.tipoVotacion || sec.acuerdo) && (
          <tr>
            <td className="punto-tabla-fila-titulo">
              <span>Acuerdos</span>
            </td>
            <td className="punto-tabla-acuerdo">
              {sec.acuerdo && renderConOcultos(sec.acuerdo)}
            </td>
          </tr>
        )}
      </tbody>
    </table>
    </div>
  );
}

function VistaProyecto({ onEditar }) {
  const { terminoBusqueda, sidebarTerciarioAbierto, setModalActivo, setPreviewArchivo, setPuntoAdjuntarId, panelVistaCompleta, setSeccionEnVista, setScrollASeccionFn } = useUI();
  const { secciones, seccionActual, setSeccionActual, proyectoMeta, puntoSeleccionadoId, setPuntoSeleccionadoId, moverPunto, eliminarPunto, toggleAnexo, sesiones, sesionActivaFecha } = useProyecto();
  const listaCerrada = sesionActivaFecha ? !!sesiones[sesionActivaFecha]?.listaCerrada : false;
  const seccionRefs = useRef({});

  const modoBusqueda = terminoBusqueda.trim().length > 0;

  function puntosDe(seccionKey) {
    const puntosDeSeccion = seccionKey === 'asuntos generales'
      ? secciones.filter(s => s.seccion === 'asuntos generales' || s.origenAG)
      : secciones.filter(s => s.seccion === seccionKey);
    return ordenarPorSeccion(obtenerPuntosFiltrados(puntosDeSeccion, terminoBusqueda));
  }

  function confirmarEliminar(sec) {
    const idx = secciones.indexOf(sec);
    if (idx <= 0 || sec.fijo) return;
    if (confirm(`¿Eliminar "${getTituloPunto(sec, idx)}"?`)) {
      eliminarPunto(sec.id);
    }
  }

  function irAPuntoEnAG(id) {
    setSeccionActual('asuntos generales');
    setPuntoSeleccionadoId(id);
  }

  function agruparPorSeccionDestino(puntos) {
    const grupos = [];
    puntos.forEach(sec => {
      const clave = sec.id === 'sec_fijo_3' ? '__fijo__' : (sec.seccion || 'sin sección');
      let grupo = grupos.find(g => g.clave === clave);
      if (!grupo) { grupo = { clave, items: [] }; grupos.push(grupo); }
      grupo.items.push(sec);
    });
    return grupos;
  }

  function ordenarPorSeccion(puntos) {
    return [...puntos].sort((a, b) => {
      const idxA = SECCIONES_DEL_DOCUMENTO.indexOf(a.seccion);
      const idxB = SECCIONES_DEL_DOCUMENTO.indexOf(b.seccion);
      if (idxA !== idxB) return idxA - idxB;
      return secciones.indexOf(a) - secciones.indexOf(b);
    });
  }

  function renderPuntos(seccionKey, pts) {
    if (seccionKey === 'asuntos generales') {
      return agruparPorSeccionDestino(sidebarTerciarioAbierto ? pts.slice().reverse() : pts).map(grupo => (
        <div key={grupo.clave}>
          {grupo.clave !== '__fijo__' && (
            <div className="ag-grupo-separador">
              {grupo.clave.charAt(0).toUpperCase() + grupo.clave.slice(1)}
            </div>
          )}
          {grupo.items.map(sec => {
            const idx = secciones.indexOf(sec);
            if (sec.id === 'sec_fijo_3') {
              return (
                <div key={sec.id} className="ag-titulo-fijo">
                  <span>{getTituloPunto(sec, idx)}</span>
                  <span className="ag-titulo-label">Asuntos Generales</span>
                </div>
              );
            }
            const puedeSubir = idx > 0 && secciones[idx - 1].seccion === sec.seccion;
            const puedeBajar = idx < secciones.length - 1 && secciones[idx + 1].seccion === sec.seccion;
            return (
              <TarjetaPunto
                key={sec.id}
                sec={sec}
                idx={idx}
                secciones={secciones}
                puedeSubir={puedeSubir}
                puedeBajar={puedeBajar}
                esSeleccionada={sec.id === puntoSeleccionadoId}
                onSeleccionar={() => setPuntoSeleccionadoId(sec.id)}
                onMover={moverPunto}
                onEditar={onEditar}
                onEliminar={confirmarEliminar}
                onToggleAnexo={toggleAnexo}
                onPreviewArchivo={(a) => { setPreviewArchivo(a); setModalActivo('preview'); }}
                onAdjuntar={(id) => { setPuntoAdjuntarId(id); setModalActivo('adjuntar'); }}
                listaCerrada={listaCerrada}
              />
            );
          })}
        </div>
      ));
    }
    return (sidebarTerciarioAbierto ? pts.slice().reverse() : pts).map(sec => {
      const idx = secciones.indexOf(sec);
      if (sec.id === 'sec_fijo_3') {
        return (
          <div key={sec.id} className="ag-titulo-fijo">
            <span>{getTituloPunto(sec, idx)}</span>
            <span className="ag-titulo-label">Asuntos Generales</span>
          </div>
        );
      }
      if (sec.origenAG && sec.seccion === seccionKey) {
        const titulo = getTituloPunto(sec, idx, secciones);
        return (
          <div
            key={sec.id}
            className="badge-origen-ag"
            onClick={() => irAPuntoEnAG(sec.id)}
            title={`Registrado en Asuntos Generales · ${sec.dependencia || 'Pleno'}`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="badge-origen-ag-codigo">{titulo}</span>
                <span className="badge-origen-ag-label">Registrado en Asuntos Generales</span>
              </div>
              <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.4' }}>
                {sec.contenido ? sec.contenido.replace(/\*\*/g, '') : 'Sin contenido'}
              </div>
            </div>
            <span className="badge-origen-ag-dep">{sec.dependencia || 'Pleno'}</span>
          </div>
        );
      }
      const puedeSubir = idx > 0 && secciones[idx - 1].seccion === sec.seccion;
      const puedeBajar = idx < secciones.length - 1 && secciones[idx + 1].seccion === sec.seccion;
      return (
        <TarjetaPunto
          key={sec.id}
          sec={sec}
          idx={idx}
          puedeSubir={puedeSubir}
          puedeBajar={puedeBajar}
          esSeleccionada={sec.id === puntoSeleccionadoId}
          onSeleccionar={() => setPuntoSeleccionadoId(sec.id)}
          onMover={moverPunto}
          onEditar={onEditar}
          onEliminar={confirmarEliminar}
          onToggleAnexo={toggleAnexo}
          onPreviewArchivo={(a) => { setPreviewArchivo(a); setModalActivo('preview'); }}
          onAdjuntar={(id) => { setPuntoAdjuntarId(id); setModalActivo('adjuntar'); }}
          listaCerrada={listaCerrada}
        />
      );
    });
  }

  useEffect(() => {
    setScrollASeccionFn(() => (sec) => {
      const el = seccionRefs.current[sec];
      const contenedor = document.getElementById('panelPrincipal');
      if (!el || !contenedor) return;
      // Se desplaza manualmente el contenedor #panelPrincipal (en vez de
      // el.scrollIntoView, que puede arrastrar el scroll a un ancestro
      // distinto y esconder el topbar) para garantizar que solo se mueve
      // este contenedor.
      const delta = el.getBoundingClientRect().top - contenedor.getBoundingClientRect().top;
      contenedor.scrollTo({ top: contenedor.scrollTop + delta - 12, behavior: 'smooth' });
    });
    return () => setScrollASeccionFn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!panelVistaCompleta) return;
    const contenedor = document.getElementById('panelPrincipal');
    if (!contenedor) return;
    function actualizarSeccionVisible() {
      const referencia = contenedor.getBoundingClientRect().top + 90;
      let actual = SECCIONES_VISIBLES[0];
      for (const sec of SECCIONES_VISIBLES) {
        const el = seccionRefs.current[sec];
        if (el && el.getBoundingClientRect().top <= referencia) actual = sec;
      }
      setSeccionEnVista(actual);
    }
    actualizarSeccionVisible();
    contenedor.addEventListener('scroll', actualizarSeccionVisible);
    return () => contenedor.removeEventListener('scroll', actualizarSeccionVisible);
  }, [panelVistaCompleta, secciones, terminoBusqueda, setSeccionEnVista]);

  if (panelVistaCompleta) {
    return (
      <div className="panel-proyecto">
        <div className="lista-puntos-expandida">
          {SECCIONES_VISIBLES.map(sec => {
            const ptsSeccion = puntosDe(sec);
            return (
              <div key={sec} ref={(el) => { seccionRefs.current[sec] = el; }}>
                <div className="seccion-completa-separador">
                  {sec.charAt(0).toUpperCase() + sec.slice(1)}
                </div>
                {ptsSeccion.length === 0
                  ? <div className="placeholder-msg" style={{ padding: '10px 0', margin: 0 }}>Sin puntos en esta sección.</div>
                  : renderPuntos(sec, ptsSeccion)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const pts = puntosDe(seccionActual);

  return (
    <div className="panel-proyecto">
      {pts.length === 0 ? (
        modoBusqueda ? (
          <div className="placeholder-msg" style={{ marginTop: '60px' }}><strong>No se encontraron coincidencias</strong><br />Prueba con otro término.</div>
        ) : (
          <div className="placeholder-msg" style={{ marginTop: '60px' }}>
            <strong>No hay puntos en {seccionActual.charAt(0).toUpperCase() + seccionActual.slice(1)}</strong><br />
            Haz clic en el botón + para crear uno.
          </div>
        )
      ) : (
        <div className="lista-puntos-expandida">
          {renderPuntos(seccionActual, pts)}
        </div>
      )}
    </div>
  );
}

function VistaSesionPrevia() {
  const { secciones, puntoPreviaSeleccionadoId, setPuntoPreviaSeleccionadoId, eliminarPunto, actualizarPunto, asistentes, sesiones, sesionActivaFecha } = useProyecto();
  const { terminoBusqueda, setModalActivo, setPreviewArchivo, setPuntoAdjuntarId } = useUI();
  const horaFinSesion = sesionActivaFecha ? sesiones[sesionActivaFecha]?.horaFin : null;

  if (secciones.length === 0) {
    return <div className="placeholder-msg" style={{ marginTop: '60px' }}><strong>No hay un proyecto creado</strong><br />Genera un proyecto para revisar sus puntos.</div>;
  }

  if (horaFinSesion) {
    return <ListaEngroses />;
  }

  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  if (puntosFiltrados.length === 0) {
    return <div className="placeholder-msg" style={{ marginTop: '60px' }}><strong>No hay coincidencias</strong></div>;
  }

  const sec = secciones.find(s => s.id === puntoPreviaSeleccionadoId) || puntosFiltrados[0];
  const idxGlobal = secciones.indexOf(sec);
  const titulo = getTituloPunto(sec, idxGlobal, secciones);
  const aprobado = sec.aprobado === true;
  const dependencia = sec.dependencia || 'Pleno';
  const idxFiltrado = puntosFiltrados.findIndex(s => s.id === sec.id);
  const puedeAnterior = idxFiltrado > 0;
  const puedeSiguiente = idxFiltrado < puntosFiltrados.length - 1;
  const esFijo = sec.fijo === true;
  const textoVotoFijo = sec.id === 'sec_fijo_1'
    ? 'El Pleno, en votación económica, por unanimidad, aprueba el orden del día.'
    : 'El Pleno, en votación económica, por unanimidad, aprueba el acta e instruye la elaboración y publicación de la versión pública.';
  const lineasAcuerdo = (sec.acuerdo || '').split('\n').filter(l => l.trim() !== '');
  const esAcuerdoUnico = lineasAcuerdo.length === 1 && /^ÚNICO\.?\s*/i.test(lineasAcuerdo[0].trim());
  const textoAcuerdoUnico = esAcuerdoUnico
    ? lineasAcuerdo[0].trim().replace(/^ÚNICO\.?\s*/i, '').replace(/\.\s*$/, '')
    : '';
  const textoVotacionMostrado = sec.votacionTextoManual !== undefined
    ? sec.votacionTextoManual
    : (aprobado ? generarTextoVotacion() : 'El punto debe estar aprobado para contar con votación.');

  function eliminar() {
    if (esFijo) return;
    if (confirm(`¿Eliminar "${titulo}"?`)) {
      eliminarPunto(sec.id);
      const restantes = puntosFiltrados.filter(s => s.id !== sec.id);
      setPuntoPreviaSeleccionadoId(restantes.length > 0 ? restantes[Math.min(idxFiltrado, restantes.length - 1)].id : null);
    }
  }
  function formatearVotanteQuorum(nombreEnQuorum) {
    const a = asistentes.find(x => x.nombre === nombreEnQuorum);
    if (!a) return nombreEnQuorum;
    const articulo = a.genero === 'femenino' ? 'la' : 'el';
    const gradoMap = {
      'Licenciatura': a.genero === 'femenino' ? 'licenciada' : 'licenciado',
      'Maestría': a.genero === 'femenino' ? 'maestra' : 'maestro',
      'Doctorado': a.genero === 'femenino' ? 'doctora' : 'doctor'
    };
    const gradoTexto = gradoMap[a.grado] || '';
    return `${articulo} ${gradoTexto} ${a.nombre}`.replace(/\s+/g, ' ').trim();
  }
  function generarTextoVotacion() {
    if (!sec.tipoVotacion) return 'Sin votación registrada.';
    let v;
    try { v = JSON.parse(sec.tipoVotacion); } catch { return describirVotacion(sec.tipoVotacion); }
    const estadoLabel = v.estado ? 'aprueba' : 'acuerda';

    if (v.voto === 1 || v.voto === 2) {
      const cantidadTexto = v.voto === 1 ? 'cuatro' : 'tres';
      const nombresVotantes = (v.quorum && v.quorum.length > 0)
        ? v.quorum.map(formatearVotanteQuorum).join(' y ')
        : '<<pendiente>>';
      const base = `El Pleno, por mayoría de ${cantidadTexto} votos, con el voto en contra de ${nombresVotantes}, `;
      if (esAcuerdoUnico) {
        return base + estadoLabel + ' ' + textoAcuerdoUnico.charAt(0).toLowerCase() + textoAcuerdoUnico.slice(1) + '.';
      }
      return base + estadoLabel + ':';
    }

    if (esAcuerdoUnico) {
      return describirVotacion(sec.tipoVotacion).replace(/\.\s*$/, '') + ', ' + textoAcuerdoUnico.charAt(0).toLowerCase() + textoAcuerdoUnico.slice(1) + '.';
    }
    return describirVotacion(sec.tipoVotacion);
  }

  return (
    <>
      <div className="doc-header">
        <div className="doc-title">{titulo}</div>
      </div>
      <div className={'previa-card' + (aprobado ? ' aprobado' : '')}>
        <div className="previa-tags">
          <span className="previa-tag">{dependencia}</span>
          <span className="previa-tag">{sec.seccion}</span>
        </div>
        <div className="previa-cuerpo">
          {sec.contenido ? renderConOcultos(sec.contenido) : 'Sin contenido'}
        </div>
        <div className="previa-campos">
          {esFijo && sec.seccion === 'aprobaciones' ? (
            <div className="ter-field">
              <div className="votacion-resultado">{textoVotoFijo}</div>
            </div>
          ) : (
            <>
              <div className="ter-field">
                {aprobado ? (
                  sec.seccion === 'informes' ? (
                    <SelectorInforme
                      value={sec.tipoVotacion || ''}
                      onChange={(nuevoValor) => actualizarPunto(sec.id, { tipoVotacion: nuevoValor, votacionTextoManual: nuevoValor })}
                    />
                  ) : (
                    <TipoVotacionSelector
                      value={sec.tipoVotacion || ''}
                      onChange={(nuevoValor) => actualizarPunto(sec.id, { tipoVotacion: nuevoValor, votacionTextoManual: undefined })}
                      nombresQuorum={asistentes.map(a => a.nombre)}
                    />
                  )
                ) : (
                  <span className="email-vacio">Disponible solo si el punto está aprobado</span>
                )}
                <div
                  className={'votacion-resultado' + (!aprobado || !sec.tipoVotacion ? ' votacion-resultado-vacio' : '')}
                  contentEditable={aprobado}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    if (!aprobado) return;
                    actualizarPunto(sec.id, { votacionTextoManual: e.currentTarget.textContent });
                  }}
                >
                  {textoVotacionMostrado}
                </div>
              </div>
              {!esAcuerdoUnico && sec.seccion !== 'informes' && (
                <div className="ter-field">
                  <label className="ter-label">Acuerdo</label>
                  <div className="acuerdo-texto">
                    {lineasAcuerdo.map((linea, i, arr) => (
                      <span key={i}>
                        {renderConOcultos(linea)}
                        {i < arr.length - 1 && <hr className="acuerdo-separador" />}
                      </span>
                    ))}
                    {lineasAcuerdo.length === 0 && <span className="email-vacio">Sin acuerdo registrado</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {sec.archivos && sec.archivos.filter(a => a.adjuntadoEnSesion).length > 0 && (
          <div className="archivos-adjuntos">
            {sec.archivos.filter(a => a.adjuntadoEnSesion).map((a, i) => (
              <span key={i} className="archivo-item" onClick={() => { setPreviewArchivo(a); setModalActivo('preview'); }}>
                {a.nombre}
              </span>
            ))}
          </div>
        )}
        <div className="previa-footer">
          <button className="btn-adjuntar" id="btnAdjuntarPrevia" title="Adjuntar archivo" onClick={() => { setPuntoAdjuntarId(sec.id); setModalActivo('adjuntar'); }}>
            <i className="fas fa-paperclip"></i>
          </button>
          <button className="btn-eliminar" id="btnEliminarPrevia" disabled={esFijo} onClick={eliminar}>{esFijo ? 'Fijo' : 'Eliminar'}</button>
          <button className="btn-mover" id="btnPreviaAnterior" disabled={!puedeAnterior} onClick={() => setPuntoPreviaSeleccionadoId(puntosFiltrados[idxFiltrado - 1].id)}>◀</button>
          <button className="btn-mover" id="btnPreviaSiguiente" disabled={!puedeSiguiente} onClick={() => setPuntoPreviaSeleccionadoId(puntosFiltrados[idxFiltrado + 1].id)}>▶</button>
        </div>
      </div>
    </>
  );
}

export default function PanelPrincipal({ onEditarPunto }) {
  const { vistaActual, sidebarDerechoAbierto, previewEngroseAbierta } = useUI();

  let contenido = null;
  if (vistaActual === 'inicio') contenido = <VistaInicio />;
  else if (vistaActual === 'proyecto') contenido = <VistaProyecto onEditar={onEditarPunto} />;
  else if (vistaActual === 'sesionPrevia') contenido = <VistaSesionPrevia />;
  else if (vistaActual === 'actaSesion') contenido = <VistaHistorial />;

  const clases = 'main'
    + (sidebarDerechoAbierto && vistaActual === 'proyecto' ? ' shifted' : '')
    + (previewEngroseAbierta && vistaActual === 'sesionPrevia' ? ' shifted-engrose' : '');

  return <main className={clases} id="panelPrincipal">{contenido}</main>;
}