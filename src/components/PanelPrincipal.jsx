import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { getTituloPunto, formatearFechaES } from '../utils/fechas.js';
import { SECCIONES_DEL_DOCUMENTO, obtenerPuntosFiltrados, describirVotacion } from '../utils/puntos.js';
import '../styles/PanelPrincipal.css';
import VistaInicio from './VistaInicio.jsx';
import VistaHistorial from './VistaHistorial.jsx';
import { renderConOcultos, tieneTextoOculto } from '../utils/texto.js';
import TipoVotacionSelector from './TipoVotacionSelector.jsx';

function TarjetaPunto({ sec, idx, puedeSubir, puedeBajar, esSeleccionada, listaCerrada, onSeleccionar, onMover, onEditar, onEliminar, onToggleAnexo, onPreviewArchivo, onAdjuntar }) {
  const titulo = getTituloPunto(sec, idx);
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
            <span className="punto-tabla-titulo">{titulo}</span>
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
            <span className={'badge-publico' + (tieneTextoOculto(sec.contenido) ? ' pendiente' : ' listo')}>
              {tieneTextoOculto(sec.contenido) ? 'Pendiente' : 'Listo'}
            </span>
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
              <span className={'badge-publico' + (tieneTextoOculto(sec.acuerdo) ? ' pendiente' : ' listo')}>
                {tieneTextoOculto(sec.acuerdo) ? 'Pendiente' : 'Listo'}
              </span>
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
  const { terminoBusqueda, sidebarTerciarioAbierto, setModalActivo, setPreviewArchivo, setPuntoAdjuntarId } = useUI();
  const { secciones, seccionActual, proyectoMeta, puntoSeleccionadoId, setPuntoSeleccionadoId, moverPunto, eliminarPunto, toggleAnexo, sesiones, sesionActivaFecha } = useProyecto();
  const listaCerrada = sesionActivaFecha ? !!sesiones[sesionActivaFecha]?.listaCerrada : false;

  // === FILTRO POR SECCIÓN + BÚSQUEDA ===
  const puntosDeSeccion = secciones.filter(s => s.seccion === seccionActual);
  const pts = obtenerPuntosFiltrados(puntosDeSeccion, terminoBusqueda);
  const modoBusqueda = terminoBusqueda.trim().length > 0;

  function confirmarEliminar(sec) {
    const idx = secciones.indexOf(sec);
    if (idx <= 0 || sec.fijo) return;
    if (confirm(`¿Eliminar "${getTituloPunto(sec, idx)}"?`)) {
      eliminarPunto(sec.id);
    }
  }

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
          {pts.map(sec => {
            const idx = secciones.indexOf(sec);
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
          })}
        </div>
      )}
    </div>
  );
}

function VistaSesionPrevia() {
  const { secciones, puntoPreviaSeleccionadoId, setPuntoPreviaSeleccionadoId, eliminarPunto, actualizarPunto, asistentes } = useProyecto();
  const { terminoBusqueda } = useUI();

  if (secciones.length === 0) {
    return <div className="placeholder-msg" style={{ marginTop: '60px' }}><strong>No hay un proyecto creado</strong><br />Genera un proyecto para revisar sus puntos.</div>;
  }

  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  if (puntosFiltrados.length === 0) {
    return <div className="placeholder-msg" style={{ marginTop: '60px' }}><strong>No hay coincidencias</strong></div>;
  }

  const sec = secciones.find(s => s.id === puntoPreviaSeleccionadoId) || puntosFiltrados[0];
  const idxGlobal = secciones.indexOf(sec);
  const titulo = getTituloPunto(sec, idxGlobal);
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
              <TipoVotacionSelector
                value={sec.tipoVotacion || ''}
                onChange={(nuevoValor) => actualizarPunto(sec.id, { tipoVotacion: nuevoValor, votacionTextoManual: undefined })}
                nombresQuorum={asistentes.map(a => a.nombre)}
              />
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
              {!esAcuerdoUnico && (
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
        <div className="previa-footer">
          <button className="btn-eliminar" id="btnEliminarPrevia" disabled={esFijo} onClick={eliminar}>{esFijo ? 'Fijo' : 'Eliminar'}</button>
          <button className="btn-mover" id="btnPreviaAnterior" disabled={!puedeAnterior} onClick={() => setPuntoPreviaSeleccionadoId(puntosFiltrados[idxFiltrado - 1].id)}>◀</button>
          <button className="btn-mover" id="btnPreviaSiguiente" disabled={!puedeSiguiente} onClick={() => setPuntoPreviaSeleccionadoId(puntosFiltrados[idxFiltrado + 1].id)}>▶</button>
        </div>
      </div>
    </>
  );
}

export default function PanelPrincipal({ onEditarPunto }) {
  const { vistaActual, sidebarDerechoAbierto } = useUI();

  let contenido = null;
  if (vistaActual === 'inicio') contenido = <VistaInicio />;
  else if (vistaActual === 'proyecto') contenido = <VistaProyecto onEditar={onEditarPunto} />;
  else if (vistaActual === 'sesionPrevia') contenido = <VistaSesionPrevia />;
  else if (vistaActual === 'actaSesion') contenido = <VistaHistorial />;

  return <main className={'main' + (sidebarDerechoAbierto && vistaActual === 'proyecto' ? ' shifted' : '')} id="panelPrincipal">{contenido}</main>;
}