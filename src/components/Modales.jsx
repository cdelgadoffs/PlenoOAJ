import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { guardarArchivo, obtenerURLArchivo } from '../utils/archivosDB.js';
import { obtenerFechasDisponiblesExtraordinaria, hoyLocalISO } from '../utils/fechas.js';
/*import { hoyLocalISO, calcularFechaAnterior, obtenerFechasDisponiblesExtraordinaria } from '../utils/fechas.js';*/

/*function ModalActa() {
  const { modalActivo, setModalActivo } = useUI();
  const { proyectoMeta, agregarActa } = useProyecto();
  const [tipo, setTipo] = useState('Ordinaria');
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    if (modalActivo !== 'acta') return;
    setTipo(proyectoMeta.tipoSesion || 'Ordinaria');
    setFecha(proyectoMeta.fecha ? (calcularFechaAnterior(proyectoMeta.fecha, 7) || '') : '');
  }, [modalActivo]);

  function confirmar() {
    if (!fecha) { alert('Selecciona una fecha.'); return; }
    agregarActa(tipo, fecha);
    setModalActivo(null);
  }

  return (
    <div className={'modal-overlay' + (modalActivo === 'acta' ? ' active' : '')} id="modalActa">
      <div className="modal-content">
        <h3>Aprobación del acta anterior</h3>
        <label>Tipo de sesión anterior</label>
        <select id="actaTipoSesion" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="Ordinaria">Ordinaria</option>
          <option value="Extraordinaria">Extraordinaria</option>
        </select>
        <label>Fecha de la sesión anterior</label>
        <input type="date" id="actaFecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <div className="modal-actions">
          <button className="btn-cancel" id="actaCancel" onClick={() => setModalActivo(null)}>Cancelar</button>
          <button className="btn-confirm" id="actaConfirm" onClick={confirmar}>Agregar</button>
        </div>
      </div>
    </div>
  );
}*/

function ModalNuevoProyecto() {
  const { modalActivo, setModalActivo, setVistaActual } = useUI();
  const { sesiones, crearSesionExtraordinaria } = useProyecto();
  const [fechasDisponibles, setFechasDisponibles] = useState([]);
  const [fecha, setFecha] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (modalActivo !== 'nuevoProyecto') return;
    const disponibles = obtenerFechasDisponiblesExtraordinaria(sesiones);
    setFechasDisponibles(disponibles);
    const hoy = hoyLocalISO();
    const existeHoy = disponibles.some(d => d.fecha === hoy);
    setFecha(existeHoy ? hoy : (disponibles[0]?.fecha || ''));
    setConfirmado(false);
    setCreando(false);
  }, [modalActivo]);

  async function confirmar() {
    if (!confirmado) return;
    if (!fecha) { alert('No hay fechas disponibles para una sesión extraordinaria.'); return; }
    if (sesiones[fecha] && !confirm(`Ya existe una sesión en ${fecha}. ¿Sobrescribir?`)) return;
    setCreando(true);
    crearSesionExtraordinaria(fecha);
    setModalActivo(null);
    setVistaActual('proyecto');
    setCreando(false);
  }

  return (
    <div className={'modal-overlay' + (modalActivo === 'nuevoProyecto' ? ' active' : '')} id="modalNuevoProyecto">
      <div className="modal-content">
        <h3>Nueva sesión extraordinaria</h3>
        <label>Fecha de la sesión</label>
        <select id="nuevoFecha" value={fecha} onChange={(e) => setFecha(e.target.value)}>
          {fechasDisponibles.length === 0 && <option value="">No hay fechas disponibles</option>}
          {fechasDisponibles.map(d => (
            <option key={d.fecha} value={d.fecha}>{d.etiqueta}</option>
          ))}
        </select>
        <div className="checkbox-group">
          <input type="checkbox" id="confirmNewProject" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
          <label htmlFor="confirmNewProject" style={{ display: 'inline', textTransform: 'none', fontWeight: '400' }}>
            Confirmo que quiero crear esta sesión extraordinaria
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" id="modalNuevoCancel" onClick={() => setModalActivo(null)}>Cancelar</button>
          <button className="btn-confirm" id="modalNuevoConfirm" disabled={!confirmado || creando || !fecha} onClick={confirmar}>Crear</button>
        </div>
      </div>
    </div>
  );
}

function ModalPrevisualizacion() {
  const { modalActivo, setModalActivo, previewArchivo } = useUI();
  const archivo = previewArchivo;
  const activo = modalActivo === 'preview' && archivo;
  const tieneVistaPrevia = archivo && (archivo.tipo.startsWith('image/') || archivo.tipo === 'application/pdf' || archivo.tipo.startsWith('text/'));
  const [url, setUrl] = useState(null);
  const [textoPlano, setTextoPlano] = useState('');

  useEffect(() => {
    let urlActual = null;
    if (activo && archivo) {
      obtenerURLArchivo(archivo.id).then(u => {
        urlActual = u;
        setUrl(u);
        if (archivo.tipo.startsWith('text/') && u) {
          fetch(u).then(r => r.text()).then(setTextoPlano).catch(() => setTextoPlano('No se pudo leer el texto.'));
        }
      });
    } else {
      setUrl(null);
      setTextoPlano('');
    }
    return () => { if (urlActual) URL.revokeObjectURL(urlActual); };
  }, [activo, archivo?.id]);

  let contenido = null;
  if (archivo && url) {
    if (archivo.tipo.startsWith('image/')) {
      contenido = <img src={url} style={{ maxWidth: '100%', maxHeight: '80vh' }} alt={archivo.nombre} />;
    } else if (archivo.tipo === 'application/pdf') {
      contenido = <embed src={url} type="application/pdf" style={{ width: '100%', height: '80vh' }} />;
    } else if (archivo.tipo.startsWith('text/')) {
      contenido = <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', maxHeight: '70vh', overflow: 'auto', background: '#f5f5f5', padding: '10px' }}>{textoPlano}</pre>;
    } else {
      contenido = (
        <>
          <p style={{ marginBottom: '16px' }}>No se puede mostrar vista previa de este tipo de archivo ({archivo.tipo}).</p>
          <button className="btn-confirm" style={{ padding: '8px 24px', fontSize: '14px' }} onClick={() => {
            const link = document.createElement('a');
            link.href = url; link.download = archivo.nombre;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
          }}>Descargar archivo</button>
        </>
      );
    }
  }

  return (
    <div className={'modal-overlay' + (activo ? ' active' : '')} id="modalPrevisualizacion">
      <div className={'modal-content' + (tieneVistaPrevia ? ' modal-preview-full' : ' modal-preview-compact')}>
        <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 id="previewTitle" style={{ marginBottom: '0' }}>{archivo?.nombre || 'Archivo'}</h3>
          <button className="btn-close-derecho" id="btnCerrarPreview2" onClick={() => setModalActivo(null)}>✕</button>
        </div>
        <div id="previewContent">{contenido}</div>
        <div className="modal-actions">
          <button className="btn-cancel" id="btnCerrarPreview" onClick={() => setModalActivo(null)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function ModalAdjuntar() {
  const { modalActivo, setModalActivo, puntoAdjuntarId } = useUI();
  const { adjuntarArchivoAPunto } = useProyecto();
  const [archivo, setArchivo] = useState(null);

  useEffect(() => { if (modalActivo !== 'adjuntar') setArchivo(null); }, [modalActivo]);

  async function confirmar() {
    if (!archivo) { alert('Selecciona un archivo.'); return; }
    if (archivo.size > 15 * 1024 * 1024) { alert('El archivo excede 15MB.'); return; }
    const id = 'arch_' + Date.now();
    try {
      await guardarArchivo(id, archivo);
      adjuntarArchivoAPunto(puntoAdjuntarId, { id, nombre: archivo.name, tipo: archivo.type });
      setModalActivo(null);
      setArchivo(null);
    } catch (err) {
      alert('No se pudo guardar el archivo: ' + err.message);
    }
  }

  return (
    <div className={'modal-overlay' + (modalActivo === 'adjuntar' ? ' active' : '')} id="modalAdjuntar">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <h3><i className="fas fa-paperclip"></i> Adjuntar archivo</h3>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>Selecciona un archivo (máx 15MB) para adjuntar al punto seleccionado.</p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
          <input
            type="file" id="adjuntarArchivoInput"
            style={{ flex: '1', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', fontSize: '12px' }}
            onChange={(e) => setArchivo(e.target.files[0] || null)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" id="btnAdjuntarCancel" onClick={() => setModalActivo(null)}><i className="fas fa-times"></i> Cancelar</button>
          <button className="btn-confirm" id="btnAdjuntarConfirm" onClick={confirmar}><i className="fas fa-check"></i> Adjuntar</button>
        </div>
      </div>
    </div>
  );
}

export default function Modales() {
  return (
    <>
      <ModalNuevoProyecto />
      <ModalPrevisualizacion />
      <ModalAdjuntar />
    </>
  );
}
