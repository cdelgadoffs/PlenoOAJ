import { useEffect, useRef, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { hoyLocalISO, formatearFechaES, sumarDias } from '../utils/fechas.js';
import { obtenerSesionesDelMes, obtenerSesionesDeLaSemana, obtenerMiercolesSemana } from '../utils/calendario.js';
import CalendarioInteractivo from './CalendarioInteractivo.jsx';
import '../styles/CintaSesiones.css';
import { cargarFiltroCinta, guardarFiltroCinta } from '../utils/storage.js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function CintaSesiones() {
  const { vistaActual, sidebarTerciarioAbierto } = useUI();
  const { sesiones, sesionActivaFecha, proyectoMeta, cargarSesion } = useProyecto();
  const [mes, setMes] = useState(() => (sesionActivaFecha || hoyLocalISO()).substring(0, 7));
  const [semanaAncla, setSemanaAncla] = useState(() => sesionActivaFecha || hoyLocalISO());
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const botonRef = useRef(null);
  const menuRef = useRef(null);

  // Estados para el calendario expandido
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [calendarioMes, setCalendarioMes] = useState(() => mes);
  const [calendarioPos, setCalendarioPos] = useState({ top: 0, left: 0 });
  const calendarioRef = useRef(null);
  const calendarioBotonRef = useRef(null);

  const [filtroCinta, setFiltroCinta] = useState(() => cargarFiltroCinta());
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [filtroMenuPos, setFiltroMenuPos] = useState({ top: 0, left: 0 });
  const filtroBotonRef = useRef(null);
  const filtroMenuRef = useRef(null);

  // Efecto para cerrar menú de meses
  useEffect(() => {
    function manejarClickFuera(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        botonRef.current && !botonRef.current.contains(e.target)
      ) setMenuAbierto(false);
    }
    document.addEventListener('mousedown', manejarClickFuera);
    return () => document.removeEventListener('mousedown', manejarClickFuera);
  }, []);

  // Efecto para cerrar calendario al hacer clic fuera o scroll/resize
  useEffect(() => {
    if (!calendarioAbierto) return;

    function manejarClickFueraCalendario(e) {
      if (
        calendarioRef.current && !calendarioRef.current.contains(e.target) &&
        calendarioBotonRef.current && !calendarioBotonRef.current.contains(e.target)
      ) {
        setCalendarioAbierto(false);
      }
    }

    function cerrarPorScrollOResize() {
      setCalendarioAbierto(false);
    }

    document.addEventListener('mousedown', manejarClickFueraCalendario);
    window.addEventListener('scroll', cerrarPorScrollOResize, true);
    window.addEventListener('resize', cerrarPorScrollOResize);
    return () => {
      document.removeEventListener('mousedown', manejarClickFueraCalendario);
      window.removeEventListener('scroll', cerrarPorScrollOResize, true);
      window.removeEventListener('resize', cerrarPorScrollOResize);
    };
  }, [calendarioAbierto]);

  // Efecto para cerrar menú de meses por scroll/resize
  useEffect(() => {
    if (!menuAbierto) return;
    function cerrarPorScrollOResize(e) {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setMenuAbierto(false);
    }
    window.addEventListener('scroll', cerrarPorScrollOResize, true);
    window.addEventListener('resize', cerrarPorScrollOResize);
    return () => {
      window.removeEventListener('scroll', cerrarPorScrollOResize, true);
      window.removeEventListener('resize', cerrarPorScrollOResize);
    };
  }, [menuAbierto]);

  useEffect(() => { guardarFiltroCinta(filtroCinta); }, [filtroCinta]);

  const oculto = vistaActual !== 'proyecto' && vistaActual !== 'inicio' && vistaActual !== 'actaSesion';
  const modoFormulario = sidebarTerciarioAbierto;

  const mesActivo = mes;
  const [anio, mesNum] = mesActivo.split('-');
  const mesLabel = `${MESES[parseInt(mesNum, 10) - 1]} ${anio}`;

  const mesesDisponibles = Array.from(new Set([
    ...Object.keys(sesiones).map(f => f.substring(0, 7)),
    hoyLocalISO().substring(0, 7)
  ])).sort();

  const fechasDelMes = obtenerSesionesDelMes(sesiones, mesActivo);
  const fechas = filtroCinta === 'semanal'
    ? obtenerSesionesDeLaSemana(sesiones, semanaAncla)
    : (filtroCinta === 'ordinaria' || filtroCinta === 'extraordinaria')
      ? fechasDelMes.filter(f => sesiones[f]?.tipoSesion?.toLowerCase() === filtroCinta)
      : fechasDelMes;
    const hoy = hoyLocalISO();
  
  let proximaGlobal = null;
  for (const f of Object.keys(sesiones).sort()) {
    if (f >= hoy) { proximaGlobal = f; break; }
  }

  const mesProxima = proximaGlobal ? proximaGlobal.substring(0, 7) : null;
  const mostrarBotonIrActual = mesProxima && (
    filtroCinta === 'semanal'
      ? semanaAncla.substring(0, 7) !== mesProxima || obtenerMiercolesSemana(semanaAncla) !== obtenerMiercolesSemana(proximaGlobal)
      : mes !== mesProxima
  );

  function cambiarMes(delta) {
    const [a, m] = mesActivo.split('-').map(Number);
    let nuevoMes = m + delta, nuevoAnio = a;
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    setMes(`${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`);
  }
  function cambiarSemana(delta) {
    setSemanaAncla(prev => {
      const nueva = sumarDias(prev, delta * 7);
      const mesNuevo = nueva.substring(0, 7);
      setMes(mesActual => mesActual === mesNuevo ? mesActual : mesNuevo);
      return nueva;
    });
  }

  function toggleMenu() {
    if (!menuAbierto && botonRef.current) {
      const rect = botonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setMenuAbierto(v => !v);
  }
  function toggleFiltroMenu() {
    if (!filtroMenuAbierto && filtroBotonRef.current) {
      const rect = filtroBotonRef.current.getBoundingClientRect();
      setFiltroMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setFiltroMenuAbierto(v => !v);
  }

const OPCIONES_FILTRO = [
  { id: 'todas', label: 'Todas' },
  { id: 'ordinaria', label: 'Sesiones Ordinarias' },
  { id: 'extraordinaria', label: 'Sesiones Extraordinarias' },
  { id: 'semanal', label: 'Vista semanal' }
];

  function seleccionarMes(m) {
    setMes(m);
    if (filtroCinta === 'semanal') {
      const fechasDelMesNuevo = obtenerSesionesDelMes(sesiones, m);
      setSemanaAncla(fechasDelMesNuevo[0] || `${m}-01`);
    }
    setMenuAbierto(false);
  }
  function irASesionActual() {
    if (!mesProxima) return;
    setMes(mesProxima);
    if (filtroCinta === 'semanal' && proximaGlobal) {
      setSemanaAncla(proximaGlobal);
    }
  }
  // Funciones para el calendario expandido
  function toggleCalendario() {
    if (!calendarioAbierto && calendarioBotonRef.current) {
      const rect = calendarioBotonRef.current.getBoundingClientRect();
      setCalendarioPos({
        top: rect.bottom + 8,
        left: rect.right - 320, // Ancho aproximado del calendario
      });
    }
    setCalendarioAbierto(prev => !prev);
    if (!calendarioAbierto) {
      setCalendarioMes(mes);
    }
  }

  function cambiarMesCalendario(delta) {
    const [a, m] = calendarioMes.split('-').map(Number);
    let nuevoMes = m + delta, nuevoAnio = a;
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    setCalendarioMes(`${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`);
  }

  const tituloSesion = `Sesión ${proyectoMeta.tipoSesion || 'Ordinaria'} N° ${proyectoMeta.numeroSesion || 1}` +
    (proyectoMeta.fecha ? ` · ${formatearFechaES(proyectoMeta.fecha)}` : '');

  useEffect(() => {
    function manejarClickFuera(e) {
      if (
        filtroMenuRef.current && !filtroMenuRef.current.contains(e.target) &&
        filtroBotonRef.current && !filtroBotonRef.current.contains(e.target)
      ) setFiltroMenuAbierto(false);
    }
    document.addEventListener('mousedown', manejarClickFuera);
    return () => document.removeEventListener('mousedown', manejarClickFuera);
  }, []);

  useEffect(() => {
    if (!filtroMenuAbierto) return;
    function cerrarPorScrollOResize(e) {
      if (filtroMenuRef.current && filtroMenuRef.current.contains(e.target)) return;
      setFiltroMenuAbierto(false);
    }
    window.addEventListener('scroll', cerrarPorScrollOResize, true);
    window.addEventListener('resize', cerrarPorScrollOResize);
    return () => {
      window.removeEventListener('scroll', cerrarPorScrollOResize, true);
      window.removeEventListener('resize', cerrarPorScrollOResize);
    };
  }, [filtroMenuAbierto]);

  return (
    <div className={'cinta-sesiones-wrap' + (oculto ? ' hidden' : '') + (modoFormulario ? ' modo-formulario' : '')} id="cintaSesionesWrap">
      <div className="cinta-sesiones" id="cintaSesionesContainer">
        <div className="cinta-nav-group">
          <button className="cinta-nav cinta-nav-expandible" id="cintaAnterior" onClick={() => filtroCinta === 'semanal' ? cambiarSemana(-1) : cambiarMes(-1)}>
            <span className="icono">◀</span>
            <span className="texto">{filtroCinta === 'semanal' ? 'Semana anterior' : 'Mes anterior'}</span>
          </button>
          <button className="cinta-nav cinta-nav-expandible" id="cintaSiguiente" onClick={() => filtroCinta === 'semanal' ? cambiarSemana(1) : cambiarMes(1)}>
            <span className="icono">▶</span>
            <span className="texto">{filtroCinta === 'semanal' ? 'Semana siguiente' : 'Mes siguiente'}</span>
          </button>
          {mostrarBotonIrActual && (
            <button className="cinta-nav" id="cintaIrActual" onClick={irASesionActual}>
              <span className="icono">↩</span>
              <span className="texto">Volver a sesión actual</span>
            </button>
          )}
        </div>
        <div
          ref={botonRef}
          className={'cinta-mes dropdown-toggle' + (menuAbierto ? ' abierto' : '')}
          id="cintaMesLabel"
          onClick={toggleMenu}
        >
          {mesLabel}
          <span className="dropdown-chevron">▾</span>
        </div>
        <div
          className="cinta-titulo-sesion"
          id="cintaTituloSesion"
          style={{ display: modoFormulario ? 'block' : 'none', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: '#1a1a1a', flex: '1' }}
        >
          {tituloSesion}
        </div>
        <div className="cinta-fechas" id="cintaFechas">
          {fechas.length === 0 && (
            <div style={{ padding: '4px 0', color: '#999', fontSize: '12px' }}>
              {filtroCinta === 'semanal' ? 'No hay sesiones en esta semana' : 'No hay sesiones en este mes'}
            </div>
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

            const diaMes = formatearFechaES(f).split(' de ').slice(0, 2).join(' de '); // "n de mes"
            const numeroTexto = sesion.numeroSesion ? ('N° ' + sesion.numeroSesion) : '(no celebrada)';
            const diaLabel = `Sesión ${sesion.tipoSesion || 'Ordinaria'} del ${diaMes}`;
            const label = esSeleccionada ? `${diaLabel} ${numeroTexto}` : diaLabel;
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

        <div
          ref={filtroBotonRef}
          className={'cinta-mes cinta-filtro-toggle dropdown-toggle' + (filtroMenuAbierto ? ' abierto' : '')}
          onClick={toggleFiltroMenu}
        >
          {OPCIONES_FILTRO.find(o => o.id === filtroCinta)?.label}
          <span className="dropdown-chevron">▾</span>
        </div>

        {/* Botón calendario - ícono sin borde, alineado a la derecha */}
        <button
          ref={calendarioBotonRef}
          className={`cinta-calendario-toggle ${calendarioAbierto ? 'activo' : ''}`}
          onClick={toggleCalendario}
          title="Ver calendario ampliado"
        >
          📅
        </button>

        {/* Dropdown del calendario - flotante con position fixed */}
        {calendarioAbierto && (
          <div
            ref={calendarioRef}
            className="cinta-calendario-dropdown"
            style={{
              position: 'fixed',
              top: calendarioPos.top,
              left: calendarioPos.left,
              width: '320px',
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              padding: '8px',
              zIndex: 9999,
            }}
          >
            <CalendarioInteractivo
              mes={calendarioMes}
              onChangeMes={cambiarMesCalendario}
              sesiones={sesiones}
              proximaGlobal={proximaGlobal}
              hoy={hoy}
              sesionActivaFecha={sesionActivaFecha}
              cargarSesion={cargarSesion}
              modoFormulario={modoFormulario}
              onClose={() => setCalendarioAbierto(false)}
            />
          </div>
        )}
      </div>

      {menuAbierto && (
        <div
          ref={menuRef}
          className="dropdown-menu"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {mesesDisponibles.map(m => {
            const [a, me] = m.split('-');
            const activo = m === mesActivo;
            return (
              <div
                key={m}
                className={'dropdown-item' + (activo ? ' activo' : '')}
                onClick={() => seleccionarMes(m)}
              >
                {MESES[parseInt(me, 10) - 1]} {a}
              </div>
            );
          })}
        </div>
      )}

      {filtroMenuAbierto && (
        <div ref={filtroMenuRef} className="dropdown-menu" style={{ top: filtroMenuPos.top, left: filtroMenuPos.left }}>
          {OPCIONES_FILTRO.map(o => (
            <div
              key={o.id}
              className={'dropdown-item' + (o.id === filtroCinta ? ' activo' : '')}
              onClick={() => { setFiltroCinta(o.id); setFiltroMenuAbierto(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}