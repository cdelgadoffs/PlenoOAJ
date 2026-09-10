import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { formatearFechaES } from '../utils/fechas.js';
import '../styles/NuevoSidebarSecundario.css';

export default function NuevoSidebarSecundario() {
  const { panelNuevoActivo, mostrarFormularioCalendario } = useUI();
  const { excepciones, eliminarExcepcion } = useProyecto();

  if (panelNuevoActivo !== 'calendarizacion' || !mostrarFormularioCalendario) {
    return <aside className="nuevo-sidebar-secundario hidden" id="nuevoSidebarSecundario"></aside>;
  }

  const asuetos = excepciones.asuetos || [];

  return (
    <aside className="nuevo-sidebar-secundario" id="nuevoSidebarSecundario">
      <div className="nss-header">
        <div className="nss-titulo">Días de asueto</div>
        <div className="nss-subtitulo">{asuetos.length} registro{asuetos.length === 1 ? '' : 's'}</div>
      </div>
      <div className="nss-lista">
        {asuetos.length === 0 ? (
          <div className="nss-vacio">No hay asuetos registrados</div>
        ) : (
          asuetos.map((a, idx) => (
            <div key={idx} className="nss-item">
              <div className="nss-item-info">
                <div className="nss-item-fecha">{formatearFechaES(a.fecha)}</div>
                <div className="nss-item-destino">→ {formatearFechaES(a.destino)}</div>
              </div>
              <button
                className="nss-item-eliminar"
                title="Eliminar asueto"
                onClick={() => eliminarExcepcion('asuetos', idx)}
              >✕</button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}