import { useProyecto } from '../context/ProyectoContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import '../styles/BotonTerminarSesion.css';

// Cierra formalmente la sesión activa (la marca como "terminada", lo que la
// deja fuera de la próxima sesión y la muestra como celebrada en la cinta y
// el calendario) y regresa a VistaInicio, mostrando el resumen de la propia
// sesión que se acaba de celebrar.
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
