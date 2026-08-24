import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { usePermisos } from '../hooks/usePermisos.js';
import { parsearFechaLocal } from '../utils/fechas.js';

const VISTAS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'proyecto', label: 'Proyecto del orden del día', badge: true, id2: 'navProyecto' },
  { id: 'sesionPrevia', label: 'Previa de sesión' },
  { id: 'actaSesion', label: 'Acta de sesión' }
];

export default function SidebarPrincipal({ onGenerarPDF, totalPuntos = 0 }) {
  const { vistaActual, setVistaActual } = useUI();
  const { proyectoMeta } = useProyecto();
  const { esLector } = usePermisos();

  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  const numero = proyectoMeta.numeroSesion || 1;
  let fechaTexto = 'Fecha no definida';
  if (proyectoMeta.fecha) {
    const fechaObj = parsearFechaLocal(proyectoMeta.fecha);
    fechaTexto = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
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
          return (
          <div
            key={v.id}
            className={'nav-item' + (vistaActual === v.id ? ' active' : '')}
            data-vista={v.id}
            id={v.id2}
            onClick={() => setVistaActual(v.id)}
          >
            <span className="nav-dot"></span>
            <span>{v.label}</span>
            {v.badge && <span className="badge-total" id="totalBadge">{totalPuntos}</span>}
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
