import { useAuth } from '../context/AuthContext.jsx';

export function usePermisos() {
  const { tieneRol } = useAuth();
  const esAdmin = tieneRol('Admin') || tieneRol('Administrador');
  const esLector = tieneRol('ReadOnly') && !esAdmin && !tieneRol('PuntosWrite');

  const puede = (rol) => esAdmin || tieneRol(rol);

  return {
    esAdmin,
    esLector,
    puedeCalendarizacion: puede('Calendarization'),
    puedeEmail: puede('Email'),
    puedeSync: esAdmin, // sincronización local solo para administradores
    puedeNuevoProyecto: esAdmin, // crear sesión extraordinaria
    puedeEditarPuntos: puede('PuntosWrite')
  };
}
