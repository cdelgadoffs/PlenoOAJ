import { useProyecto } from '../context/ProyectoContext.jsx';
import VistaPreviaActa from './VistaPreviaActa.jsx';

export default function VistaInicio() {
  const { secciones, sesiones, sesionActivaFecha, asistentes } = useProyecto();

  const sesionActiva = sesionActivaFecha ? sesiones[sesionActivaFecha] : null;
  const sesionCelebrada = !!(sesionActiva?.horaInicio && sesionActiva?.horaFin);

  const presentes = asistentes.filter(a => a.presente).length;
  const estadoLabel = sesionCelebrada ? 'Celebrada' : (sesionActiva?.horaInicio ? 'En curso' : 'Pendiente');

  const resumen = (
    <>
      <div className="doc-header">
        <div className="doc-title">Resumen</div>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-card"><div className="numero">{estadoLabel}</div><div className="etiqueta">Estado de la sesión</div></div>
        <div className="dashboard-card"><div className="numero">{secciones.length}</div><div className="etiqueta">Puntos totales</div></div>
        <div className="dashboard-card"><div className="numero">{presentes}/{asistentes.length}</div><div className="etiqueta">Quórum</div></div>
      </div>
    </>
  );

  if (!sesionCelebrada) return resumen;

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', height: '100%' }}>
      <div style={{ flex: '1 1 0', minWidth: 0 }}>{resumen}</div>
      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        <VistaPreviaActa />
      </div>
    </div>
  );
}
