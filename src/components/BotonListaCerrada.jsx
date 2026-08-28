import { useProyecto } from '../context/ProyectoContext.jsx';

export default function BotonListaCerrada() {
  const { sesiones, sesionActivaFecha, toggleListaCerrada } = useProyecto();
  const cerrada = sesionActivaFecha ? !!sesiones[sesionActivaFecha]?.listaCerrada : false;

  function manejarClick() {
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
      {cerrada ? 'Reabrir lista' : 'Cerrar lista'}
    </button>
  );
}