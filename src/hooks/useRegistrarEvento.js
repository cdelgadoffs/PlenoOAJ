import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { registrarEvento } from '../utils/eventosDB.js';

export function useRegistrarEvento() {
  const { cuentaActiva } = useAuth();
  const { sesionActivaFecha } = useProyecto();

  const registrar = useCallback((categoria, accion, detalle = '') => {
    registrarEvento({
      sesionFecha: sesionActivaFecha,
      usuarioNombre: cuentaActiva?.name || '',
      usuarioCorreo: cuentaActiva?.username || '',
      categoria,
      accion,
      detalle
    }).catch(err => console.error('No se pudo registrar el evento:', err));
  }, [cuentaActiva, sesionActivaFecha]);

  return registrar;
}