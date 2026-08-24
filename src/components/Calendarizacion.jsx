import { useEffect, useState } from 'react';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { formatearFechaES, formatearFechaCorta, hoyLocalISO, sumarDias, parsearFechaLocal } from '../utils/fechas.js';
import { obtenerSesionesDelMes } from '../utils/calendario.js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Calendarizacion({ mostrarFormulario, setMostrarFormulario, onVolver }) {
  const {
    sesiones, diaSesion, excepciones, sesionActivaFecha,
    regenerarCalendario, agregarVacacion, agregarAsueto, eliminarExcepcion,
    cargarSesion, eliminarSesion
  } = useProyecto();

  const haySesiones = Object.keys(sesiones).length > 0;
  const [diaSeleccionado, setDiaSeleccionado] = useState(diaSesion);
  const [vacInicio, setVacInicio] = useState('');
  const [vacFin, setVacFin] = useState('');
  const [asuetoFecha, setAsuetoFecha] = useState('');
  const [asuetoDestino, setAsuetoDestino] = useState('');
  const [sobrescribir, setSobrescribir] = useState(!haySesiones);
  const [calendarioStatus, setCalendarioStatus] = useState({ texto: '', ok: false });
  const [mesControl, setMesControl] = useState(() => (sesionActivaFecha || hoyLocalISO()).substring(0, 7));

  useEffect(() => {
    if (!haySesiones) setMostrarFormulario(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function generarCalendario() {
    if (!sobrescribir) {
      alert('Debes marcar la casilla "Sobrescribir calendario existente" para regenerar el calendario.');
      return;
    }
    const dia = parseInt(diaSeleccionado, 10);
    if (dia < 1 || dia > 5) {
      setCalendarioStatus({ texto: 'Selecciona un día válido.', ok: false });
      return;
    }
    regenerarCalendario(dia);
    setCalendarioStatus({ texto: 'Calendario generado correctamente.', ok: true });
    setMostrarFormulario(false);
  }

  function opcionesAsueto(fecha) {
    if (!fecha) return [];
    const d = parsearFechaLocal(fecha);
    if (d.getDay() !== diaSesion) {
      alert('Esa fecha no coincide con un día de sesión ordinaria; no requiere reprogramación.');
      return [];
    }
    const anterior = sumarDias(fecha, -1);
    const siguiente = sumarDias(fecha, 1);
    return [
      { value: anterior, label: `${formatearFechaES(anterior)} (día anterior)` },
      { value: siguiente, label: `${formatearFechaES(siguiente)} (día siguiente)` }
    ];
  }

  const opcionesAsuetoActuales = opcionesAsueto(asuetoFecha);

  const fechasMes = obtenerSesionesDelMes(sesiones, mesControl);
  const hoy = hoyLocalISO();
  let proximaGlobal = null;
  for (const f of Object.keys(sesiones).sort()) { if (f >= hoy) { proximaGlobal = f; break; } }

  const mesesDisponibles = Array.from(new Set([
    ...Object.keys(sesiones).map(f => f.substring(0, 7)),
    hoy.substring(0, 7)
  ])).sort();

  let totalPuntos = 0, celebradas = 0;
  fechasMes.forEach(f => {
    const s = sesiones[f];
    if (!s) return;
    totalPuntos += s.secciones ? s.secciones.length : 0;
    if (f < hoy && s.secciones && s.secciones.some(p => !p.fijo)) celebradas++;
  });

  return (
    <div className="sb-nav nuevo-panel" id="panelCalendarizacion">
      <button className="btn-volver-nuevo" id="btnVolverMenuCalendario" onClick={onVolver}>Volver</button>

      {mostrarFormulario ? (
        <div id="panelCreacionCalendario">
          <div className="email-field">
            <label className="email-label">Día de la sesión ordinaria</label>
            <select id="diaSesionSelect" className="ter-select" value={diaSeleccionado} onChange={(e) => setDiaSeleccionado(e.target.value)}>
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
            </select>
          </div>

          <div className="email-field" style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '16px' }}>
            <label className="email-label">Periodo vacacional (excluye sesiones)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" id="vacacionInicio" className="ter-select" style={{ flex: '1' }} value={vacInicio} onChange={(e) => setVacInicio(e.target.value)} />
              <input type="date" id="vacacionFin" className="ter-select" style={{ flex: '1' }} value={vacFin} min={vacInicio} onChange={(e) => setVacFin(e.target.value)} />
            </div>
            <button id="btnAgregarVacacion" className="btn-add-invitado" style={{ width: '100%', marginTop: '6px' }} onClick={() => {
              if (!vacInicio || !vacFin) { alert('Selecciona ambas fechas.'); return; }
              if (vacInicio > vacFin) { alert('La fecha de inicio debe ser anterior a la de fin.'); return; }
              agregarVacacion(vacInicio, vacFin);
              setVacInicio(''); setVacFin('');
            }}>Agregar periodo</button>
            <div id="listaVacaciones" className="email-invitados-lista">
              {excepciones.vacaciones.length === 0
                ? <span className="email-vacio">Ningún periodo agregado</span>
                : excepciones.vacaciones.map((v, idx) => (
                  <span key={idx} className="email-invitado-chip">
                    {formatearFechaES(v.inicio)} — {formatearFechaES(v.fin)}
                    <span className="eliminar-invitado" onClick={() => eliminarExcepcion('vacaciones', idx)}>✕</span>
                  </span>
                ))}
            </div>
          </div>

          <div className="email-field" style={{ marginTop: '16px', borderTop: '1px solid #333', paddingTop: '16px' }}>
            <label className="email-label">Día de asueto (reprograma la sesión)</label>
            <input type="date" id="asuetoFecha" className="ter-select" style={{ width: '100%' }} value={asuetoFecha} onChange={(e) => { setAsuetoFecha(e.target.value); setAsuetoDestino(''); }} />
            {opcionesAsuetoActuales.length > 0 && (
              <div id="asuetoOpciones" style={{ marginTop: '6px' }}>
                <select id="asuetoDestino" className="ter-select" style={{ width: '100%' }} value={asuetoDestino} onChange={(e) => setAsuetoDestino(e.target.value)}>
                  <option value="">Selecciona destino</option>
                  {opcionesAsuetoActuales.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button id="btnAgregarAsueto" className="btn-add-invitado" style={{ width: '100%', marginTop: '6px' }} onClick={() => {
                  if (!asuetoFecha || !asuetoDestino) return;
                  agregarAsueto(asuetoFecha, asuetoDestino);
                  setAsuetoFecha(''); setAsuetoDestino('');
                }}>Agregar asueto</button>
              </div>
            )}
            <div id="listaAsuetos" className="email-invitados-lista">
              {excepciones.asuetos.length === 0
                ? <span className="email-vacio">Ningún asueto agregado</span>
                : excepciones.asuetos.map((a, idx) => (
                  <span key={idx} className="email-invitado-chip">
                    {formatearFechaES(a.fecha)} → {formatearFechaES(a.destino)}
                    <span className="eliminar-invitado" onClick={() => eliminarExcepcion('asuetos', idx)}>✕</span>
                  </span>
                ))}
            </div>
          </div>

          <div className="email-field" style={{ marginTop: '16px', borderTop: '1px solid #333', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#ddd', cursor: 'pointer' }}>
              <input type="checkbox" id="confirmSobrescribir" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} />
              Sobrescribir calendario existente
            </label>
          </div>

          <button id="btnGenerarCalendario" className="btn-enviar-email" style={{ marginTop: '16px' }} onClick={generarCalendario}>Generar calendario anual</button>
          <div id="calendarioStatus" className={'email-status' + (calendarioStatus.texto ? (calendarioStatus.ok ? ' ok' : ' error') : '')} style={{ marginTop: '10px' }}>{calendarioStatus.texto}</div>
        </div>
      ) : (
        <div id="panelControlAnual">
          <div className="email-field">
            <label className="email-label">Control anual de sesiones</label>
            <select id="controlMesSelect" className="ter-select" style={{ marginBottom: '8px' }} value={mesControl} onChange={(e) => setMesControl(e.target.value)}>
              {mesesDisponibles.map(m => {
                const [a, me] = m.split('-');
                return <option key={m} value={m}>{MESES[parseInt(me, 10) - 1]} {a}</option>;
              })}
            </select>
            <div id="controlResumen" className="control-resumen">
              <span>Sesiones: {fechasMes.length}</span>
              <span>Puntos totales: {totalPuntos}</span>
              <span>Celebradas: {celebradas}</span>
            </div>
            <div id="controlAnualLista" className="control-anual-grid">
              {fechasMes.length === 0 && <div className="email-vacio">No hay sesiones en este mes</div>}
              {fechasMes.map(f => {
                const sesion = sesiones[f];
                if (!sesion) return null;
                const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
                const totalPts = sesion.secciones ? sesion.secciones.length : 0;
                const esSeleccionada = f === sesionActivaFecha;
                const puedeEliminar = sesion.tipoSesion === 'Extraordinaria';
                const numeroTexto = sesion.numeroSesion ? `N° ${sesion.numeroSesion}` : '(no celebrada)';
                let clase = 'control-item';
                let estado = '';
                if (f === proximaGlobal) { clase += ' proxima'; estado = 'Próxima'; }
                else if (f < hoy) { clase += tieneContenido ? ' celebrada' : ' no-celebrada'; estado = tieneContenido ? 'Celebrada' : 'No celebrada'; }
                else { clase += ' pendiente'; estado = 'Pendiente'; }

                return (
                  <div key={f} className={clase} onClick={() => cargarSesion(f)}>
                    <span className="control-fecha">Sesión {sesion.tipoSesion} {numeroTexto}</span>
                    <span className="control-tipo">{formatearFechaCorta(f)}</span>
                    <span className="control-puntos">{totalPts} pts</span>
                    <span className="control-estado">{esSeleccionada ? 'Activa' : estado}</span>
                    <button
                      className="btn-eliminar-sesion"
                      title={puedeEliminar ? 'Eliminar sesión' : 'Las sesiones ordinarias no se pueden eliminar, solo editar'}
                      disabled={!puedeEliminar}
                      onClick={(e) => { e.stopPropagation(); eliminarSesion(f); }}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
