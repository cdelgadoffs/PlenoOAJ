import { useState } from 'react';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { SECCIONES_DEL_DOCUMENTO } from '../utils/puntos.js';
import { generarWordActa } from '../utils/wordActa.js';
import { generarZipArchivosSesion } from '../utils/zipArchivos.js'; 

export default function VistaInicio() {
  const { secciones, sesiones, sesionActivaFecha, proyectoMeta, asistentes } = useProyecto();
  const [generandoActa, setGenerandoActa] = useState(false);

  const sesionActiva = sesionActivaFecha ? sesiones[sesionActivaFecha] : null;
  const listaCerrada = sesionActiva ? !!sesionActiva.listaCerrada : false;
  const sesionCelebrada = !!(sesionActiva?.horaInicio && sesionActiva?.horaFin);

  const presentes = asistentes.filter(a => a.presente).length;
  const estadoLabel = sesionCelebrada ? 'Celebrada' : (sesionActiva?.horaInicio ? 'En curso' : 'Pendiente');

  const conteoPorSeccion = SECCIONES_DEL_DOCUMENTO.map(sec => ({
    nombre: sec.charAt(0).toUpperCase() + sec.slice(1),
    total: secciones.filter(s => s.seccion === sec).length
  })).filter(s => s.total > 0);

  async function generarActa() {
    setGenerandoActa(true);
    try {
      await generarWordActa(secciones, proyectoMeta, asistentes, sesionActiva);
    } catch (err) {
      alert('No se pudo generar el acta: ' + err.message);
    } finally {
      setGenerandoActa(false);
    }
  }

  const [generandoZip, setGenerandoZip] = useState(false);
  const hayArchivos = secciones.some(s => s.archivos && s.archivos.length > 0) || (listaCerrada && secciones.length > 0);

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

  return (
    <>
      <div className="doc-header">
        <div className="doc-type">Inicio</div>
        <div className="doc-title">Panel de control</div>
        <div className="doc-sub">Bienvenido al generador de órdenes del día</div>
      </div>
      <div className="section-title">Resumen</div>
      <div className="dashboard-grid">
        <div className="dashboard-card"><div className="numero">{estadoLabel}</div><div className="etiqueta">Estado de la sesión</div></div>
        <div className="dashboard-card"><div className="numero">{secciones.length}</div><div className="etiqueta">Puntos totales</div></div>
        <div className="dashboard-card"><div className="numero">{presentes}/{asistentes.length}</div><div className="etiqueta">Quórum</div></div>
      </div>

      {conteoPorSeccion.length > 0 && (
        <div style={{ marginTop: '20px', padding: '20px', background: '#f7f7f7', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
            Puntos por sección
          </div>
          {conteoPorSeccion.map(s => (
            <div key={s.nombre} className="clasificacion-item">
              <span className="clas-nombre">{s.nombre}</span>
              <span className="clas-conteo">{s.total}</span>
            </div>
          ))}
        </div>
      )}
      {hayArchivos && (
        <div style={{ marginTop: '20px' }}>
          <button
            className="btn-nuevo-proyecto"
            style={{ margin: 0 }}
            disabled={generandoZip}
            onClick={descargarZip}
          >
            {generandoZip ? 'Generando ZIP...' : 'Descargar archivos adjuntos (ZIP)'}
          </button>
        </div>
      )}
      {sesionCelebrada && (
        <div style={{ marginTop: '20px', padding: '20px', background: '#f1f9f1', borderRadius: '6px', border: '1px solid #a5d6a7' }}>
          <div className="section-title" style={{ marginBottom: '10px' }}>Sesión celebrada</div>
          <p style={{ fontSize: '13px', color: '#333', marginBottom: '4px' }}>
            <strong>Inicio:</strong> {new Date(sesionActiva.horaInicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            <strong>Fin:</strong> {new Date(sesionActiva.horaFin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '14px' }}>
            {secciones.length} punto{secciones.length === 1 ? '' : 's'} registrados en el orden del día.
          </p>
          <button
            className="btn-nuevo-proyecto"
            style={{ margin: 0 }}
            disabled={generandoActa || secciones.length === 0}
            onClick={generarActa}
          >
            {generandoActa ? 'Generando...' : 'Descargar acta de sesión'}
          </button>
        </div>
      )}
    </>
  );
}