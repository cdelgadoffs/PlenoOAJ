import { useProyecto } from '../context/ProyectoContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import '../styles/BotonTerminarSesion.css';

export default function BotonTerminarSesion() {
  const { terminarSesionCelebracion } = useProyecto();
  const { setVistaActual } = useUI();

  function manejarClick() {
    terminarSesionCelebracion();
    setVistaActual('inicio');
  }

  return (
    <button className="btn-terminar-sesion" onClick={manejarClick}>
      Terminar sesión
    </button>
  );
}
