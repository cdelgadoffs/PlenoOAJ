import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { getTituloPunto, formatearFechaES } from '../utils/fechas.js';
import { SECCIONES_DEL_DOCUMENTO, obtenerPuntosFiltrados } from '../utils/puntos.js';

function TarjetaPunto({ sec, idx, puedeSubir, puedeBajar, esSeleccionada, onSeleccionar, onMover, onEditar, onEliminar, onToggleAnexo, onPreviewArchivo, onAdjuntar }) {
  const titulo = getTituloPunto(sec, idx);
  const esFijo = sec.fijo === true;
  const tieneArchivos = sec.archivos && sec.archivos.length > 0;
  const numeroAnexo = idx + 1;
  const dependenciaMostrada = sec.dependencia || 'Pleno';

  return (
    <div className={'punto-card' + (esSeleccionada ? ' selected' : '')} data-id={sec.id} onClick={onSeleccionar}>
      <div className="punto-card-header">
        <span className="punto-card-titulo">{titulo}</span>
        <span className="punto-card-badge">{dependenciaMostrada}</span>
      </div>
      <div className="punto-card-cuerpo">{sec.contenido || 'Sin contenido'}</div>
      {(sec.tipoVotacion || sec.acuerdo) && (
        <div className="punto-card-voto-info">
          {sec.tipoVotacion && <div className="punto-card-voto-linea"><span className="punto-card-voto-label">Votación:</span> {sec.tipoVotacion}</div>}
          {sec.acuerdo && <div className="punto-card-voto-linea"><span className="punto-card-voto-label">Acuerdo:</span> {sec.acuerdo}</div>}
        </div>
      )}
      {tieneArchivos && (
        <div className="archivos-adjuntos">
          {sec.archivos.map((a, i) => <span key={i} className="archivo-item" onClick={(e) => { e.stopPropagation(); onPreviewArchivo(a); }}>{a.nombre}</span>)}
        </div>
      )}
      <div className="punto-card-acciones">
        <div className="checkbox-group" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" id={'anexo_' + sec.id} checked={tieneArchivos || sec.anexo === true} onChange={(e) => onToggleAnexo(sec.id, e.target.checked)} />
          <label htmlFor={'anexo_' + sec.id}>Anexo {numeroAnexo}</label>
        </div>
        <div className="botones">
          <button className="btn-adjuntar" title="Adjuntar archivo" onClick={(e) => { e.stopPropagation(); onAdjuntar(sec.id); }}><i className="fas fa-paperclip"></i></button>
          <button className="btn-mover" disabled={!puedeSubir} onClick={(e) => { e.stopPropagation(); onMover(sec.id, -1); }}>▲</button>
          <button className="btn-mover" disabled={!puedeBajar} onClick={(e) => { e.stopPropagation(); onMover(sec.id, 1); }}>▼</button>
          <button className="btn-editar" disabled={esFijo} title="Editar punto" onClick={(e) => { e.stopPropagation(); onEditar(sec.id); }}>✎ Editar</button>
          <button className="btn-eliminar" disabled={esFijo} onClick={(e) => { e.stopPropagation(); onEliminar(sec); }}>{esFijo ? 'Fijo' : 'Eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

function VistaInicio() {
  const { secciones } = useProyecto();
  return (
    <>
      <div className="doc-header">
        <div className="doc-type">Inicio</div>
        <div className="doc-title">Panel de control</div>
        <div className="doc-sub">Bienvenido al generador de órdenes del día</div>
      </div>
      <div className="section-title">Resumen</div>
      <div className="dashboard-grid">
        <div className="dashboard-card"><div className="numero">{secciones.length}</div><div className="etiqueta">Puntos totales</div></div>
        <div className="dashboard-card"><div className="numero">{SECCIONES_DEL_DOCUMENTO.length}</div><div className="etiqueta">Secciones</div></div>
        <div className="dashboard-card"><div className="numero">PDF</div><div className="etiqueta">Listo para generar</div></div>
      </div>
      <div style={{ marginTop: '20px', padding: '20px', background: '#f7f7f7', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
        <p style={{ fontSize: '13px', color: '#555' }}>
          <strong>Vistas disponibles:</strong><br />
          • <strong>Inicio</strong> — Resumen general.<br />
          • <strong>Proyecto del orden del día</strong> — Gestión de puntos por sección y generación de PDF.<br />
          • <strong>Sesión previa</strong> — Revisión y aprobación de todos los puntos registrados.<br />
          • <strong>Acta de sesión</strong> — Revisión final y generación del acta en PDF.
        </p>
      </div>
    </>
  );
}

function VistaProyecto({ onEditar }) {
  const { terminoBusqueda, sidebarTerciarioAbierto, setModalActivo, setPreviewArchivo, setPuntoAdjuntarId } = useUI();
  const { secciones, seccionActual, puntoSeleccionadoId, setPuntoSeleccionadoId, moverPunto, eliminarPunto, toggleAnexo } = useProyecto();

  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  const modoBusqueda = !!terminoBusqueda;
  const listaBase = modoBusqueda ? puntosFiltrados : secciones.filter(s => s.seccion === seccionActual);
  const pts = modoBusqueda ? listaBase : (sidebarTerciarioAbierto ? [...listaBase].reverse() : listaBase);

  function confirmarEliminar(sec) {
    const idx = secciones.indexOf(sec);
    if (idx <= 0 || sec.fijo) return;
    if (confirm(`¿Eliminar "${getTituloPunto(sec, idx)}"?`)) {
      eliminarPunto(sec.id);
    }
  }

  if (pts.length === 0) {
    if (modoBusqueda) {
      return <div className="placeholder-msg" style={{ marginTop: '60px' }}><strong>No se encontraron coincidencias</strong><br />Prueba con otro término.</div>;
    }
    const nombreSeccion = seccionActual.charAt(0).toUpperCase() + seccionActual.slice(1);
    return <div className="placeholder-msg" style={{ marginTop: '60px' }}><strong>No hay puntos en {nombreSeccion}</strong><br />Haz clic en el botón + para crear uno.</div>;
  }

  return (
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
          />
        );
      })}
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

function VistaActaSesion() {
  const { secciones, proyectoMeta } = useProyecto();
  const { terminoBusqueda } = useUI();
  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  const numero = proyectoMeta.numeroSesion || 1;
  const fecha = proyectoMeta.fecha ? formatearFechaES(proyectoMeta.fecha) : 'Fecha no definida';
  const puntosFiltrados = obtenerPuntosFiltrados(secciones, terminoBusqueda);
  const pendientes = puntosFiltrados.filter(s => !s.fijo && s.aprobado !== true).length;

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
}

export default function PanelPrincipal({ onEditarPunto }) {
  const { vistaActual, sidebarDerechoAbierto } = useUI();

  let contenido = null;
  if (vistaActual === 'inicio') contenido = <VistaInicio />;
  else if (vistaActual === 'proyecto') contenido = <VistaProyecto onEditar={onEditarPunto} />;
  else if (vistaActual === 'sesionPrevia') contenido = <VistaSesionPrevia />;
  else if (vistaActual === 'actaSesion') contenido = <VistaActaSesion />;

  return <main className={'main' + (sidebarDerechoAbierto && vistaActual === 'proyecto' ? ' shifted' : '')} id="panelPrincipal">{contenido}</main>;
}
