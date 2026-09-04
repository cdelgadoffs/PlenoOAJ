import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { usePermisos } from '../hooks/usePermisos.js';
import CronometroSesion from './CronometroSesion.jsx';
import '../styles/Topbar.css';

export default function Topbar({ fechaActualTexto, onToggleSidebarNuevo, onNuevoProyecto }) {
  const { cuentaActiva, cerrarSesion } = useAuth();
  const { terminoBusqueda, setTerminoBusqueda } = useUI();
  const { sesiones, sesionActivaFecha, proyectoMeta } = useProyecto();
  const { puedeNuevoProyecto } = usePermisos();

  const horaInicioSesion = sesionActivaFecha ? sesiones[sesionActivaFecha]?.horaInicio : null;
  const horaFinSesion = sesionActivaFecha ? sesiones[sesionActivaFecha]?.horaFin : null;
  const sesionEnCurso = !!horaInicioSesion && !horaFinSesion;
  

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          id="btnToggleNuevoSidebar"
          className="btn-hamburguesa"
          aria-label="Toggle nuevo panel"
          onClick={onToggleSidebarNuevo}
          style={{ display: sesionEnCurso ? 'none' : undefined }}
        >
          ☰
        </button>
        <img
          src="https://raw.githubusercontent.com/cdelgadoffs/CGD/535876195bedc1b602f98438ee3a42ff11cbb817/logo.png"
          alt="Logo institucional"
          style={{ height: '50px', width: 'auto', marginRight: '8px' }}
        />
        {sesionEnCurso && (
          <CronometroSesion
            tipoSesion={proyectoMeta.tipoSesion}
            numero={proyectoMeta.numeroSesion}
            horaInicioSesion={horaInicioSesion}
          />
        )}
      </div>
      <div className="topbar-right">
        <div className="search-wrapper">
          <input
            type="text"
            id="buscadorGlobal"
            className="topbar-search"
            placeholder="Buscar punto..."
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
          />
          <span
            id="clearSearchBtn"
            className="clear-search-btn"
            style={{ display: terminoBusqueda ? 'inline' : 'none' }}
            onClick={() => setTerminoBusqueda('')}
          >
            ✕
          </span>
        </div>
        <button className="btn-nuevo-proyecto-top" id="btnNuevoProyecto" style={{ display: (puedeNuevoProyecto && !sesionEnCurso) ? '' : 'none' }} onClick={onNuevoProyecto}>
          <span className="btn-np-icon">+</span>
          <span className="btn-np-label">Nueva Extraordinaria</span>
        </button>
        <span id="fechaActual">{fechaActualTexto}</span>
        <div className="user-session">
          <span id="userNombre" className="user-nombre">{cuentaActiva?.name || cuentaActiva?.username || ''}</span>
          <button id="btnLogout" className="btn-logout" title="Cerrar sesión" onClick={cerrarSesion} style={{ display: sesionEnCurso ? 'none' : undefined }}>Salir</button>
        </div>
      </div>
    </header>
  );
}