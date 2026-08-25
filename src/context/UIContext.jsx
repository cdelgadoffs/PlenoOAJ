import { createContext, useContext, useState } from 'react';
import { cargarSidebarDerechoOpen, cargarNuevoSidebarOpen } from '../utils/storage.js';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [vistaActual, setVistaActual] = useState('inicio');
  const [sidebarDerechoAbierto, setSidebarDerechoAbierto] = useState(cargarSidebarDerechoOpen);
  const [sidebarNuevoAbierto, setSidebarNuevoAbierto] = useState(cargarNuevoSidebarOpen);
  const [sidebarNuevoAncho, setSidebarNuevoAncho] = useState(false);
  const [panelNuevoActivo, setPanelNuevoActivo] = useState('menu'); 
  const [sidebarTerciarioAbierto, setSidebarTerciarioAbierto] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [modalActivo, setModalActivo] = useState(null); 
  const [previewArchivo, setPreviewArchivo] = useState(null);
  const [puntoAdjuntarId, setPuntoAdjuntarId] = useState(null);

  const value = {
    vistaActual, setVistaActual,
    sidebarDerechoAbierto, setSidebarDerechoAbierto,
    sidebarNuevoAbierto, setSidebarNuevoAbierto,
    sidebarNuevoAncho, setSidebarNuevoAncho,
    panelNuevoActivo, setPanelNuevoActivo,
    sidebarTerciarioAbierto, setSidebarTerciarioAbierto,
    terminoBusqueda, setTerminoBusqueda,
    modalActivo, setModalActivo,
    previewArchivo, setPreviewArchivo,
    puntoAdjuntarId, setPuntoAdjuntarId
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI debe usarse dentro de <UIProvider>');
  return ctx;
}
