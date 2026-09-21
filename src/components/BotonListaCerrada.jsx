import { useProyecto } from '../context/ProyectoContext.jsx';
import { useUI } from '../context/UIContext.jsx';

export default function BotonListaCerrada() {
  const { sesiones, sesionActivaFecha, toggleListaCerrada } = useProyecto();
  const { avisosEdicionCorreo, setAvisosEdicionExpandido } = useUI();
  const cerrada = sesionActivaFecha ? !!sesiones[sesionActivaFecha]?.listaCerrada : false;
  const hayAvisosPendientes = !cerrada && avisosEdicionCorreo.length > 0;

  function manejarClick() {
    if (hayAvisosPendientes) {
      setAvisosEdicionExpandido(true);
      return;
    }
    const msg = cerrada
      ? '¿Reabrir el registro de puntos? Se permitirá añadir, editar y eliminar puntos.'
      : '¿Cerrar el registro de puntos? No se podrán añadir, editar ni eliminar puntos hasta reabrirlo.';
    if (confirm(msg)) toggleListaCerrada();
  }

  return (
    <button
      className={'btn-lista-toggle' + (cerrada ? ' cerrada' : ' abierta')}
      onClick={manejarClick}
      disabled={!sesionActivaFecha}
    >
      {hayAvisosPendientes ? 'Notificar cambios para cerrar lista' : (cerrada ? 'Reabrir lista' : 'Cerrar lista')}
    </button>
  );
}