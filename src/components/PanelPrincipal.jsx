import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { getTituloPunto, formatearFechaES } from '../utils/fechas.js';
import { SECCIONES_DEL_DOCUMENTO, obtenerPuntosFiltrados } from '../utils/puntos.js';
import { useState } from 'react';
import '../styles/PanelPrincipal.css';
import VistaInicio from './VistaInicio.jsx';
import { generarWordActa } from '../utils/wordActa.js';
import VistaHistorial from './VistaHistorial.jsx';
import { renderConOcultos, tieneTextoOculto } from '../utils/texto.js';

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
        <tr>
          <td className="punto-tabla-fila-titulo">
            <span>Votación</span>
          </td>
          <td className="punto-tabla-votacion">
            {sec.tipoVotacion && <span>{sec.tipoVotacion}</span>}
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  );
}

function VistaProyecto({ onEditar }) {
  const { terminoBusqueda, sidebarTerciarioAbierto, setModalActivo, setPreviewArchivo, setPuntoAdjuntarId } = useUI();
  const { secciones, seccionActual, proyectoMeta, puntoSeleccionadoId, setPuntoSeleccionadoId, moverPunto, eliminarPunto, toggleAnexo, sesiones, sesionActivaFecha } = useProyecto();
  const listaCerrada = sesionActivaFecha ? !!sesiones[sesionActivaFecha]?.listaCerrada : false;
  const [generandoWord, setGenerandoWord] = useState(false);

  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  const modoBusqueda = !!terminoBusqueda;
  const listaBase = modoBusqueda ? puntosFiltrados : secciones.filter(s => s.seccion === seccionActual);
  const pts = modoBusqueda ? listaBase : (sidebarTerciarioAbierto ? [...listaBase].reverse() : listaBase);

  async function generarWord() {
    if (secciones.length === 0) { alert('Primero genera un proyecto.'); return; }
    setGenerandoWord(true);
    try {
      await generarWordOrdenDia(secciones, proyectoMeta);
    } catch (err) {
      alert('No se pudo generar el documento Word: ' + err.message);
    } finally {
      setGenerandoWord(false);
    }
  }

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
  const { secciones, puntoPreviaSeleccionadoId, setPuntoPreviaSeleccionadoId, eliminarPunto, actualizarPunto } = useProyecto();
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
  const votoActual = sec.voto || 'Pendiente';
  const idxFiltrado = puntosFiltrados.findIndex(s => s.id === sec.id);
  const puedeAnterior = idxFiltrado > 0;
  const puedeSiguiente = idxFiltrado < puntosFiltrados.length - 1;
  const esFijo = sec.fijo === true;

  const opcionesVoto = [
    'El Pleno, en votación económica, por unanimidad, aprueba el orden del día.',
    'El Pleno, en votación económica, por unanimidad, aprueba el acta e instruye la elaboración y publicación de la versión pública.',
    'El Pleno, en votación económica, por unanimidad, acuerda:',
    'El Pleno, en votación económica, por unanimidad, aprueba…',
    'El Pleno toma conocimiento del informe presentado.',
    'El Pleno toma conocimiento de la suspensión de labores decretada.'
  ];

  function eliminar() {
    if (esFijo) return;
    if (confirm(`¿Eliminar "${titulo}"?`)) {
      eliminarPunto(sec.id);
      const restantes = puntosFiltrados.filter(s => s.id !== sec.id);
      setPuntoPreviaSeleccionadoId(restantes.length > 0 ? restantes[Math.min(idxFiltrado, restantes.length - 1)].id : null);
    }
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
        <div className="previa-cuerpo">{sec.contenido || 'Sin contenido'}</div>
        <div className="previa-campos">
          <div className="ter-field">
            <label className="ter-label">Tipo de votación</label>
            <select id="previaVotoSelect" className="ter-select" value={votoActual} onChange={(e) => actualizarPunto(sec.id, { voto: e.target.value })}>
              {!opcionesVoto.includes(votoActual) && <option value={votoActual}>{votoActual}</option>}
              {opcionesVoto.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
          <div className="ter-field">
            <label className="ter-label">Acuerdos</label>
            <textarea
              id="previaAnotaciones" className="ter-textarea"
              value={sec.anotaciones || ''}
              onChange={(e) => actualizarPunto(sec.id, { anotaciones: e.target.value })}
            ></textarea>
          </div>
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

/*function VistaActaSesion() {
  const { secciones, proyectoMeta } = useProyecto();
  const { terminoBusqueda } = useUI();
  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  const numero = proyectoMeta.numeroSesion || 1;
  const fecha = proyectoMeta.fecha ? formatearFechaES(proyectoMeta.fecha) : 'Fecha no definida';
  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  const pendientes = puntosFiltrados.filter(s => !s.fijo && s.aprobado !== true).length;
  const [generandoActa, setGenerandoActa] = useState(false);

  async function generarActa() {
    if (secciones.length === 0) { alert('Primero genera un proyecto.'); return; }
    setGenerandoActa(true);
    try {
      await generarWordActa(secciones, proyectoMeta);
    } catch (err) {
      alert('No se pudo generar el acta: ' + err.message);
    } finally {
      setGenerandoActa(false);
    }
  }

  return (
    <>
      <div className="doc-header">
        <div className="doc-type">Acta de sesión</div>
        <div className="doc-title">Sesión {tipo} N° {numero}</div>
        <div className="doc-sub">{fecha}</div>
      </div>
      {pendientes > 0 && (
        <div style={{ margin: '12px 0', padding: '10px 14px', background: '#fff4e5', border: '1px solid #f0c274', borderRadius: '6px', fontSize: '12px', color: '#8a5a00' }}>
          {pendientes} punto(s) sin votación registrada.
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          className="btn-nuevo-proyecto"
          style={{ margin: 0, width: 'auto', padding: '8px 18px' }}
          disabled={generandoActa}
          onClick={generarActa}
        >
          {generandoActa ? 'Generando...' : 'Descargar acta'}
        </button>
      </div>
      {puntosFiltrados.length === 0 ? (
        <div className="placeholder-msg" style={{ marginTop: '40px' }}><strong>No hay coincidencias</strong></div>
      ) : (
        <div className="lista-puntos-expandida">
          {puntosFiltrados.map(sec => {
            const idx = secciones.indexOf(sec);
            const titulo = getTituloPunto(sec, idx);
            const dependencia = sec.dependencia || 'Pleno';
            const voto = sec.voto || 'Pendiente';
            const colorVoto = voto === 'Pendiente' ? '#b36b00' : (voto === 'Rechazado' ? '#a11' : '#1a7a1a');
            return (
              <div className="punto-card" key={sec.id}>
                <div className="punto-card-header">
                  <span className="punto-card-titulo">{titulo}</span>
                  <span className="punto-card-badge">{dependencia}</span>
                </div>
                <div className="punto-card-cuerpo">{sec.contenido || 'Sin contenido'}</div>
                <div className="punto-card-acciones">
                  <span style={{ fontSize: '11px', color: '#999' }}>{sec.seccion}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: colorVoto }}>{voto}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}*/

export default function PanelPrincipal({ onEditarPunto }) {
  const { vistaActual, sidebarDerechoAbierto } = useUI();

  let contenido = null;
  if (vistaActual === 'inicio') contenido = <VistaInicio />;
  else if (vistaActual === 'proyecto') contenido = <VistaProyecto onEditar={onEditarPunto} />;
  else if (vistaActual === 'sesionPrevia') contenido = <VistaSesionPrevia />;
  else if (vistaActual === 'actaSesion') contenido = <VistaHistorial />;

  return <main className={'main' + (sidebarDerechoAbierto && vistaActual === 'proyecto' ? ' shifted' : '')} id="panelPrincipal">{contenido}</main>;
}
