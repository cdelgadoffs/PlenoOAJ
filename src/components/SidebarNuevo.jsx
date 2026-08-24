import { useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { usePermisos } from '../hooks/usePermisos.js';
import Calendarizacion from './Calendarizacion.jsx';
import Email from './Email.jsx';
import Quorum from './Quorum.jsx';
import Sync from './Sync.jsx';

export default function SidebarNuevo() {
  const { sidebarNuevoAbierto, sidebarNuevoAncho, setSidebarNuevoAncho, panelNuevoActivo, setPanelNuevoActivo } = useUI();
  const { puedeCalendarizacion, puedeEmail, puedeSync } = usePermisos();
  const [mostrarFormularioCalendario, setMostrarFormularioCalendario] = useState(false);

  function abrirPanel(panel, ancho) {
    setPanelNuevoActivo(panel);
    setSidebarNuevoAncho(!!ancho);
  }
  function volverAlMenu() {
    setPanelNuevoActivo('menu');
    setSidebarNuevoAncho(false);
  }

  return (
    <aside className={'sidebar-nuevo' + (sidebarNuevoAbierto ? ' open' : '') + (sidebarNuevoAncho ? ' ancho' : '')} id="sidebarNuevo">
      <div className="sb-header sb-header-nuevo">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="sb-title sb-title-nuevo">Panel de control</div>
          <button
            id="btnNuevoCalendario"
            className="btn-add"
            title="Crear nuevo calendario anual"
            style={{ display: panelNuevoActivo === 'calendarizacion' ? 'flex' : 'none' }}
            onClick={() => setMostrarFormularioCalendario(v => !v)}
          >+</button>
        </div>
        <div className="sb-subtitle sb-subtitle-nuevo" id="sidebarNuevoSubtitle">Futuras funcionalidades</div>
      </div>

      <div className={'sb-nav nuevo-panel' + (panelNuevoActivo === 'menu' ? '' : ' hidden')} id="panelMenuNuevo">
        <ul className="nuevo-menu-list">
          <li className="nuevo-menu-item" id="menuItemCalendarizacion" style={{ display: puedeCalendarizacion ? '' : 'none' }} onClick={() => abrirPanel('calendarizacion', true)}>Calendarización anual</li>
          <li className="nuevo-menu-item" data-permiso="email" id="menuItemEmail" style={{ display: puedeEmail ? '' : 'none' }} onClick={() => abrirPanel('email', false)}>Email</li>
          <li className="nuevo-menu-item" id="menuItemQuorum" onClick={() => abrirPanel('quorum', true)}>Quórum</li>
          <li className="nuevo-menu-item">Notificaciones</li>
          <li className="nuevo-menu-item">Perfil</li>
          <li className="nuevo-menu-item" id="menuItemSync" style={{ display: puedeSync ? '' : 'none' }} onClick={() => abrirPanel('sync', false)}>Carpeta local</li>
        </ul>
      </div>

      {panelNuevoActivo === 'calendarizacion' && (
        <Calendarizacion
          mostrarFormulario={mostrarFormularioCalendario}
          setMostrarFormulario={setMostrarFormularioCalendario}
          onVolver={volverAlMenu}
        />
      )}
      {panelNuevoActivo !== 'calendarizacion' && (
        <div className="sb-nav nuevo-panel hidden" id="panelCalendarizacion"></div>
      )}

      <div className={'sb-nav nuevo-panel' + (panelNuevoActivo === 'email' ? '' : ' hidden')} id="panelEmailNuevo">
        {panelNuevoActivo === 'email' && <Email onVolver={volverAlMenu} />}
      </div>

      <div className={'sb-nav nuevo-panel' + (panelNuevoActivo === 'quorum' ? '' : ' hidden')} id="panelQuorum">
        {panelNuevoActivo === 'quorum' && <Quorum onVolver={volverAlMenu} />}
      </div>

      <div className={'sb-nav nuevo-panel' + (panelNuevoActivo === 'sync' ? '' : ' hidden')} id="panelSync">
        {panelNuevoActivo === 'sync' && <Sync onVolver={volverAlMenu} />}
      </div>
    </aside>
  );
}
