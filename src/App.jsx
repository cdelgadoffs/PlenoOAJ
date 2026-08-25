import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useUI } from './context/UIContext.jsx';
import { useProyecto } from './context/ProyectoContext.jsx';
import { generarPDFConPrint } from './utils/pdf.js';
import { usePermisos } from './hooks/usePermisos.js';
import LoginGate from './components/LoginGate.jsx';
import Topbar from './components/Topbar.jsx';
import CintaSesiones from './components/CintaSesiones.jsx';
import SidebarNuevo from './components/SidebarNuevo.jsx';
import SidebarPrincipal from './components/SidebarPrincipal.jsx';
import SidebarSecundario from './components/SidebarSecundario.jsx';
import SidebarTerciario from './components/SidebarTerciario.jsx';
import PanelPrincipal from './components/PanelPrincipal.jsx';
import SidebarDerecho from './components/SidebarDerecho.jsx';
import Modales from './components/Modales.jsx';

export default function App() {
  const { cuentaActiva } = useAuth();
  const { sidebarNuevoAbierto, setSidebarNuevoAbierto, setSidebarTerciarioAbierto, setModalActivo, vistaActual, setVistaActual } = useUI();
  const { secciones, seccionActual, proyectoMeta, setPuntoEditandoId } = useProyecto();
  const { esLector } = usePermisos();
  const [fechaActualTexto, setFechaActualTexto] = useState('');

  useEffect(() => {
    document.body.classList.toggle('modo-lectura', esLector);
  }, [esLector]);

  useEffect(() => {
    if (esLector && (vistaActual === 'inicio' || vistaActual === 'proyecto')) {
      setVistaActual('sesionPrevia');
    }
  }, [esLector]);

  useEffect(() => {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setFechaActualTexto(ahora.toLocaleDateString('es-ES', opciones));
  }, []);

  return (
    <>
      <LoginGate />
      <div className={'app-shell' + (cuentaActiva ? '' : ' hidden')} id="appShell">
        <Topbar
          fechaActualTexto={fechaActualTexto}
          onToggleSidebarNuevo={() => setSidebarNuevoAbierto(!sidebarNuevoAbierto)}
          onNuevoProyecto={() => setModalActivo('nuevoProyecto')}
        />
        <CintaSesiones />
        <div className="shell">
          <SidebarNuevo />
          <SidebarPrincipal totalPuntos={secciones.length} onGenerarPDF={() => generarPDFConPrint(secciones, proyectoMeta)} />
          <SidebarSecundario onAbrirCreacion={() => {
            if (secciones.length === 0) { alert('Primero genera un proyecto.'); return; }
            if (seccionActual === 'asuntos generales') { alert('No se pueden agregar puntos a Asuntos generales.'); return; }
            if (seccionActual === 'aprobaciones') { setModalActivo('acta'); return; }
            setPuntoEditandoId(null);
            setSidebarTerciarioAbierto(true);
          }} />
          <SidebarTerciario />
          <PanelPrincipal onEditarPunto={(id) => { setPuntoEditandoId(id); setSidebarTerciarioAbierto(true); }} />
          <SidebarDerecho />
        </div>
      </div>
      <Modales />
    </>
  );
}
