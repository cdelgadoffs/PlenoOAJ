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

  let celebradas = 0;
  fechasMes.forEach(f => {
    const s = sesiones[f];
    if (!s) return;
    if (f < hoy && s.secciones && s.secciones.some(p => !p.fijo)) celebradas++;
  });

  return (
    <div className="sb-nav nuevo-panel" id="panelCalendarizacion">
      {mostrarFormulario ? (
        <>
          <button className="btn-volver-nuevo" id="btnVolverMenuCalendario" onClick={onVolver}>Volver</button>
          <div id="panelCreacionCalendario" className="cal-form">
            <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo">
              <span className="cal-form-seccion-num">1</span>
              Día de sesión ordinaria
            </div>
            <select id="diaSesionSelect" className="ter-select cal-select" value={diaSeleccionado} onChange={(e) => setDiaSeleccionado(e.target.value)}>
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
            </select>
            <div className="cal-form-hint">Las sesiones ordinarias se programarán cada semana en este día.</div>
          </div>

          <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo">
              <span className="cal-form-seccion-num">2</span>
              Periodo vacacional
            </div>
            <div className="cal-form-fechas">
              <div className="cal-form-fecha">
                <label className="cal-form-label">Inicio</label>
                <input type="date" id="vacacionInicio" className="ter-select cal-select" value={vacInicio} onChange={(e) => setVacInicio(e.target.value)} />
              </div>
              <div className="cal-form-fecha">
                <label className="cal-form-label">Fin</label>
                <input type="date" id="vacacionFin" className="ter-select cal-select" value={vacFin} min={vacInicio} onChange={(e) => setVacFin(e.target.value)} />
              </div>
            </div>
            <button id="btnAgregarVacacion" className="btn-add-invitado cal-btn-agregar" onClick={() => {
              if (!vacInicio || !vacFin) { alert('Selecciona ambas fechas.'); return; }
              if (vacInicio > vacFin) { alert('La fecha de inicio debe ser anterior a la de fin.'); return; }
              agregarVacacion(vacInicio, vacFin);
              setVacInicio(''); setVacFin('');
            }}>Agregar periodo vacacional</button>
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

          <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo">
              <span className="cal-form-seccion-num">3</span>
              Día de asueto
            </div>
            <div className="cal-form-fechas">
              <div className="cal-form-fecha">
                <label className="cal-form-label">Fecha</label>
                <input type="date" id="asuetoFecha" className="ter-select cal-select" value={asuetoFecha} onChange={(e) => { setAsuetoFecha(e.target.value); setAsuetoDestino(''); }} />
              </div>
              {opcionesAsuetoActuales.length > 0 && (
                <div className="cal-form-fecha">
                  <label className="cal-form-label">Reprogramar a</label>
                  <select id="asuetoDestino" className="ter-select cal-select" value={asuetoDestino} onChange={(e) => setAsuetoDestino(e.target.value)}>
                    <option value="">Selecciona destino</option>
                    {opcionesAsuetoActuales.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="cal-form-hint">Si un día de sesión cae en asueto, la sesión se reprograma al día hábil anterior o siguiente.</div>
            {opcionesAsuetoActuales.length > 0 && (
              <>
                <button id="btnAgregarAsueto" className="btn-add-invitado cal-btn-agregar" onClick={() => {
                  if (!asuetoFecha || !asuetoDestino) return;
                  agregarAsueto(asuetoFecha, asuetoDestino);
                  setAsuetoFecha(''); setAsuetoDestino('');
                }}>Agregar asueto</button>
                <button id="btnCancelarAsueto" className="cal-btn-cancelar" onClick={() => { setAsuetoFecha(''); setAsuetoDestino(''); }}>Cancelar</button>
              </>
            )}
          </div>

          <label className="cal-form-checkbox cal-form-checkbox-fuera">
            <input type="checkbox" id="confirmSobrescribir" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} />
            <span className="cal-form-checkbox-mark">✓</span>
            Sobrescribir calendario existente
          </label>

          <button id="btnGenerarCalendario" className="btn-enviar-email cal-btn-generar" onClick={generarCalendario}>Generar calendario anual</button>
          <div id="calendarioStatus" className={'email-status' + (calendarioStatus.texto ? (calendarioStatus.ok ? ' ok' : ' error') : '')} style={{ marginTop: '10px' }}>{calendarioStatus.texto}</div>
          </div>
        </>
      ) : (
        <div id="panelControlAnual">
          <div className="control-anual-fijo">
            <button className="btn-volver-nuevo" id="btnVolverMenuCalendario" onClick={onVolver}>Volver</button>
            <label className="email-label">Control anual de sesiones</label>
            <select id="controlMesSelect" className="ter-select" style={{ marginBottom: '8px' }} value={mesControl} onChange={(e) => setMesControl(e.target.value)}>
              {mesesDisponibles.map(m => {
                const [a, me] = m.split('-');
                return <option key={m} value={m}>{MESES[parseInt(me, 10) - 1]} {a}</option>;
              })}
            </select>
            <div id="controlResumen" className="control-resumen">
              <span>Sesiones: {fechasMes.length}</span>
              <span>Celebradas: {celebradas}</span>
            </div>
          </div>
          <div className="email-field">
            <div id="controlAnualLista" className="control-anual-grid">
              {fechasMes.length === 0 && <div className="email-vacio">No hay sesiones en este mes</div>}
              {fechasMes.map(f => {
                const sesion = sesiones[f];
                if (!sesion) return null;
                const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
                const esSeleccionada = f === sesionActivaFecha;
                const puedeEliminar = sesion.tipoSesion === 'Extraordinaria';
                let clase = 'control-item';
                let estado = '';
                if (f === proximaGlobal) { clase += ' proxima'; estado = 'Próxima'; }
                else if (f < hoy) { clase += tieneContenido ? ' celebrada' : ' no-celebrada'; estado = tieneContenido ? 'Celebrada' : 'No celebrada'; }
                else { clase += ' pendiente'; estado = 'Pendiente'; }

                return (
                  <div key={f} className={clase} onClick={() => cargarSesion(f)}>
                    <div className="control-item-top" onClick={e => e.stopPropagation()}>
                      <span className="control-titulo">
                        Sesión {sesion.tipoSesion} <span className="control-numero">N° {sesion.numeroSesion || '—'}</span>
                      </span>
                      <span className={'control-estado' + (esSeleccionada ? ' activa' : '')}>{esSeleccionada ? 'Activa' : estado}</span>
                    </div>
                    <div className="control-item-bottom">
                      <span className="control-tipo">{formatearFechaCorta(f)}</span>
                      <button
                        className="btn-eliminar-sesion"
                        title={puedeEliminar ? 'Eliminar sesión' : 'Las sesiones ordinarias no se pueden eliminar, solo editar'}
                        disabled={!puedeEliminar}
                        onClick={(e) => { e.stopPropagation(); eliminarSesion(f); }}
                      >✕</button>
                    </div>
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
