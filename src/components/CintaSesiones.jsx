import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { formatearFechaCorta, hoyLocalISO, formatearFechaES } from '../utils/fechas.js';
import { obtenerSesionesDelMes } from '../utils/calendario.js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function CintaSesiones() {
  const { vistaActual, sidebarTerciarioAbierto } = useUI();
  const { sesiones, sesionActivaFecha, proyectoMeta, cargarSesion } = useProyecto();
  const [mes, setMes] = useState(() => (sesionActivaFecha || hoyLocalISO()).substring(0, 7));

  // Cuando cambia la sesión activa (p. ej. al seleccionarla desde el
  // control anual), la cinta salta a ese mes. La navegación manual con
  // ◀ ▶ solo toca el estado local `mes`, sin depender de la sesión activa.
  useEffect(() => {
    if (sesionActivaFecha) setMes(sesionActivaFecha.substring(0, 7));
  }, [sesionActivaFecha]);

  const oculto = vistaActual !== 'proyecto' && vistaActual !== 'inicio';
  const modoFormulario = sidebarTerciarioAbierto;

  const mesActivo = mes;
  const [anio, mesNum] = mesActivo.split('-');
  const mesLabel = `${MESES[parseInt(mesNum, 10) - 1]} ${anio}`;

  const fechas = obtenerSesionesDelMes(sesiones, mesActivo);
  const hoy = hoyLocalISO();
  let proximaGlobal = null;
  for (const f of Object.keys(sesiones).sort()) {
    if (f >= hoy) { proximaGlobal = f; break; }
  }

  function cambiarMes(delta) {
    const [a, m] = mesActivo.split('-').map(Number);
    let nuevoMes = m + delta, nuevoAnio = a;
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    setMes(`${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`);
  }

  const tituloSesion = `Sesión ${proyectoMeta.tipoSesion || 'Ordinaria'} N° ${proyectoMeta.numeroSesion || 1}` +
    (proyectoMeta.fecha ? ` · ${formatearFechaES(proyectoMeta.fecha)}` : '');

  return (
    <div className={'cinta-sesiones-wrap' + (oculto ? ' hidden' : '') + (modoFormulario ? ' modo-formulario' : '')} id="cintaSesionesWrap">
      <div className="cinta-sesiones" id="cintaSesionesContainer">
        <div className="cinta-nav-group">
          <button className="cinta-nav" id="cintaAnterior" onClick={() => cambiarMes(-1)}>◀</button>
          <button className="cinta-nav" id="cintaSiguiente" onClick={() => cambiarMes(1)}>▶</button>
        </div>
        <div className="cinta-mes" id="cintaMesLabel">{mesLabel}</div>
        <div
          className="cinta-titulo-sesion"
          id="cintaTituloSesion"
          style={{ display: modoFormulario ? 'block' : 'none', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: '#1a1a1a', flex: '1' }}
        >
          {tituloSesion}
        </div>
        <div className="cinta-fechas" id="cintaFechas">
          {fechas.length === 0 && (
            <div style={{ padding: '4px 0', color: '#999', fontSize: '12px' }}>No hay sesiones en este mes</div>
          )}
          {fechas.map(f => {
            const sesion = sesiones[f];
            if (!sesion) return null;
            const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
            const totalPuntos = sesion.secciones ? sesion.secciones.length : 0;
            const puntosPropios = sesion.secciones ? sesion.secciones.filter(s => !s.fijo).length : 0;
            const esSeleccionada = f === sesionActivaFecha;

            let clase = 'badge-sesion';
            let estado = '';
            if (f === proximaGlobal) { clase += ' proxima'; estado = 'Próxima'; }
            else if (f < hoy) { clase += tieneContenido ? ' celebrada' : ' no-celebrada'; estado = tieneContenido ? 'Celebrada' : 'No celebrada'; }
            else { clase += ' pendiente'; estado = 'Pendiente'; }
            if (esSeleccionada) clase += ' activa-seleccionada';
            if (sesion.tipoSesion === 'Extraordinaria') clase += ' extraordinaria';

            const diaLabel = formatearFechaCorta(f);
            const numeroTexto = sesion.numeroSesion ? ('N° ' + sesion.numeroSesion) : '(no celebrada)';
            const label = esSeleccionada ? `${diaLabel} - Sesión ${sesion.tipoSesion || 'Ordinaria'} ${numeroTexto}` : diaLabel;
            const tooltip = `${sesion.tipoSesion || 'Ordinaria'} · ${totalPuntos} puntos (${puntosPropios} propios) · ${estado}`;

            return (
              <span
                key={f}
                className={clase}
                title={tooltip}
                onClick={() => { if (!modoFormulario) cargarSesion(f); }}
                style={modoFormulario ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
