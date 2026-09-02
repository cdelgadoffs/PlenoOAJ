import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { obtenerPermisos } from '../utils/permisosStorage.js';

const SIN_ACCESO = {
  tipo: null,
  bloqueado: true,
  permisos: {
    calendarizacion: false,
    email: false,
    sync: false,
    nuevoProyecto: false,
    editarPuntos: false,
    descargar: false
  }
};

export function usePermisos() {
  const { tieneRol, cuentaActiva } = useAuth();
  const esAdmin = tieneRol('Admin') || tieneRol('Administrador');
  const correo = cuentaActiva?.username || '';

  const [registro, setRegistro] = useState(null);
  const [cargandoPermisos, setCargandoPermisos] = useState(true);

  useEffect(() => {
    let cancelado = false;
    if (esAdmin || !correo) { setCargandoPermisos(false); setRegistro(null); return; }
    setCargandoPermisos(true);
    obtenerPermisos(correo).then(r => {
      if (!cancelado) { setRegistro(r); setCargandoPermisos(false); }
    });
    return () => { cancelado = true; };
  }, [correo, esAdmin]);

  // Admin: acceso total, no gestionado por este panel.
  if (esAdmin) {
    return {
      esAdmin: true,
      esLector: false,
      esInvitado: false,
      bloqueado: false,
      cargandoPermisos: false,
      puedeCalendarizacion: true,
      puedeEmail: true,
      puedeSync: true,
      puedeNuevoProyecto: true,
      puedeEditarPuntos: true,
      puedeDescargar: true,
      puedeGestionarUsuarios: true
    };
  }

  const datos = registro || SIN_ACCESO;
  const esInvitado = datos.tipo === 'invitado';
  const bloqueado = datos.bloqueado || !registro;
  const p = datos.permisos || SIN_ACCESO.permisos;

  const activo = !cargandoPermisos && !bloqueado;

  return {
    esAdmin: false,
    esLector: esInvitado,
    esInvitado,
    bloqueado,
    cargandoPermisos,
    puedeCalendarizacion: activo && !esInvitado && p.calendarizacion,
    puedeEmail: activo && !esInvitado && p.email,
    puedeSync: activo && !esInvitado && p.sync,
    puedeNuevoProyecto: activo && !esInvitado && p.nuevoProyecto,
    puedeEditarPuntos: activo && !esInvitado && p.editarPuntos,
    puedeDescargar: activo && !esInvitado && p.descargar,
    puedeGestionarUsuarios: false
  };
}