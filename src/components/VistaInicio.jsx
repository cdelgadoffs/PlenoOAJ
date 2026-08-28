import { useProyecto } from '../context/ProyectoContext.jsx';
import { SECCIONES_DEL_DOCUMENTO } from '../utils/puntos.js';

export default function VistaInicio() {
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