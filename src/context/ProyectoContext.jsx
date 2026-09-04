import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  cargarSesiones, cargarProyectoMeta, cargarDesdeLocalStorage,
  cargarDiaSesion, cargarExcepciones, guardarEnLocalStorage,
  guardarSesiones as persistirSesiones, guardarProyectoMeta as persistirProyectoMeta,
  guardarDiaSesion as persistirDiaSesion, guardarExcepciones as persistirExcepciones,
  cargarAsistentes, guardarAsistentes as persistirAsistentes
} from '../utils/storage.js';
import { conPuntosFijosAsegurados, conPunto2Actualizado, getInsertIndex } from '../utils/puntos.js';
import { calcularFechaAnterior, formatearFechaES, hoyLocalISO, getTituloPunto, sumarDias, padNumber, parsearFechaLocal } from '../utils/fechas.js';
import {
  generarCalendarioAnual, aplicarExcepciones, limpiarSesionesInvalidas,
  recalcularNumerosSesion, obtenerProximaSesion, siguienteFechaSesion, esFechaSesionOrdinaria
} from '../utils/calendario.js';
import { useAuth } from './AuthContext.jsx';
import { registrarEvento } from '../utils/eventosDB.js';

const ProyectoContext = createContext(null);

const metaPorDefecto = { tipoSesion: 'Ordinaria', numeroSesion: 1, fecha: '' };

export function ProyectoProvider({ children }) {
  const [secciones, setSecciones] = useState(() => cargarDesdeLocalStorage() || []);
  const [sesiones, setSesiones] = useState(() => cargarSesiones());
  const [proyectoMeta, setProyectoMeta] = useState(() => cargarProyectoMeta() || metaPorDefecto);
  const [sesionActivaFecha, setSesionActivaFecha] = useState(null);
  const [diaSesion, setDiaSesion] = useState(() => cargarDiaSesion());
  const [excepciones, setExcepciones] = useState(() => cargarExcepciones());
  const [seccionActual, setSeccionActual] = useState('aprobaciones');
  const [puntoSeleccionadoId, setPuntoSeleccionadoId] = useState(null);
  const [puntoEditandoId, setPuntoEditandoId] = useState(null);
  const [puntoPreviaSeleccionadoId, setPuntoPreviaSeleccionadoId] = useState(null);
    const [asistentes, setAsistentes] = useState(() => cargarAsistentes());

  
  useEffect(() => {
    guardarEnLocalStorage(secciones);
  }, [secciones]);

  useEffect(() => { persistirSesiones(sesiones); }, [sesiones]);
  useEffect(() => { persistirProyectoMeta(proyectoMeta); }, [proyectoMeta]);
  useEffect(() => { persistirDiaSesion(diaSesion); }, [diaSesion]);
  useEffect(() => { persistirExcepciones(excepciones); }, [excepciones]);
  useEffect(() => { persistirAsistentes(asistentes); }, [asistentes]);


  const primeraVezRef = useRef(true);
  useEffect(() => {
    if (!sesionActivaFecha) return;
    if (primeraVezRef.current) { primeraVezRef.current = false; return; }
    setSesiones(prev => {
      const previa = prev[sesionActivaFecha] || { tipoSesion: proyectoMeta.tipoSesion || 'Ordinaria', numeroSesion: 1, asistentes: [] };
      return {
        ...prev,
        [sesionActivaFecha]: {
          ...previa,
          tipoSesion: proyectoMeta.tipoSesion,
          secciones: JSON.parse(JSON.stringify(secciones)),
          asistentes: previa.asistentes || []
        }
      };
    });
  }, [secciones]);

  useEffect(() => {
    setSesiones(prev => recalcularNumerosSesion(prev));
    
  }, [diaSesion]);


  function cargarSesion(fecha) {
    if (!fecha) return;
    primeraVezRef.current = true; 
    setSesionActivaFecha(fecha);
    setSesiones(prev => {
      let nuevas = prev;
      if (!prev[fecha]) {
        const esOrdinaria = esFechaSesionOrdinaria(fecha, diaSesion);
        nuevas = { ...prev, [fecha]: { tipoSesion: esOrdinaria ? 'Ordinaria' : 'Extraordinaria', numeroSesion: 1, secciones: [], asistentes: [] } };
        nuevas = recalcularNumerosSesion(nuevas);
      }
      const data = nuevas[fecha];
      setProyectoMeta({ tipoSesion: data.tipoSesion, numeroSesion: data.numeroSesion || 1, fecha });
      const conFijos = conPuntosFijosAsegurados(JSON.parse(JSON.stringify(data.secciones || [])), data.tipoSesion);
      setSecciones(conPunto2Actualizado(conFijos, { tipoSesion: data.tipoSesion, numeroSesion: data.numeroSesion, fecha }, nuevas, calcularFechaAnterior, formatearFechaES, sumarDias));
      return nuevas;

    });
  }

  const inicializadoRef = useRef(false);
  useEffect(() => {
    if (inicializadoRef.current) return;
    inicializadoRef.current = true;
    const anio = new Date().getFullYear();
    let base = generarCalendarioAnual(sesiones, diaSesion, excepciones, anio);
    base = aplicarExcepciones(base, excepciones, null);
    base = limpiarSesionesInvalidas(base, diaSesion, null);
    if (!obtenerProximaSesion(base)) {
      base = generarCalendarioAnual(base, diaSesion, excepciones, anio + 1);
      base = aplicarExcepciones(base, excepciones, null);
      base = limpiarSesionesInvalidas(base, diaSesion, null);
    }
    base = recalcularNumerosSesion(base);
    setSesiones(base);

    let fechaActiva = obtenerProximaSesion(base);
    if (!fechaActiva) {
      const todas = Object.keys(base).sort();
      fechaActiva = todas.length > 0 ? todas[0] : siguienteFechaSesion(hoyLocalISO(), diaSesion, excepciones);
    }
    cargarSesion(fechaActiva);
    
  }, []);

  function regenerarCalendario(nuevoDia) {
    setDiaSesion(nuevoDia);
    let base = generarCalendarioAnual({}, nuevoDia, excepciones, new Date().getFullYear());
    base = aplicarExcepciones(base, excepciones, sesionActivaFecha);
    base = limpiarSesionesInvalidas(base, nuevoDia, sesionActivaFecha);
    base = recalcularNumerosSesion(base);
    setSesiones(base);
    const proxima = obtenerProximaSesion(base);
    if (proxima) cargarSesion(proxima);
  }

  function agregarVacacion(inicio, fin) {
    const nuevasExcepciones = { ...excepciones, vacaciones: [...excepciones.vacaciones, { inicio, fin }] };
    setExcepciones(nuevasExcepciones);
    let base = generarCalendarioAnual(sesiones, diaSesion, nuevasExcepciones, new Date().getFullYear());
    base = aplicarExcepciones(base, nuevasExcepciones, sesionActivaFecha);
    base = limpiarSesionesInvalidas(base, diaSesion, sesionActivaFecha);
    setSesiones(recalcularNumerosSesion(base));
  }

  function agregarAsueto(fecha, destino) {
    const nuevasExcepciones = { ...excepciones, asuetos: [...excepciones.asuetos, { fecha, destino }] };
    setExcepciones(nuevasExcepciones);
    let base = generarCalendarioAnual(sesiones, diaSesion, nuevasExcepciones, new Date().getFullYear());
    base = aplicarExcepciones(base, nuevasExcepciones, sesionActivaFecha);
    base = limpiarSesionesInvalidas(base, diaSesion, sesionActivaFecha);
    setSesiones(recalcularNumerosSesion(base));
  }

  function eliminarExcepcion(tipo, idx) {
    const nuevasExcepciones = {
      ...excepciones,
      [tipo]: excepciones[tipo].filter((_, i) => i !== idx)
    };
    setExcepciones(nuevasExcepciones);
    let base = generarCalendarioAnual(sesiones, diaSesion, nuevasExcepciones, new Date().getFullYear());
    base = aplicarExcepciones(base, nuevasExcepciones, sesionActivaFecha);
    base = limpiarSesionesInvalidas(base, diaSesion, sesionActivaFecha);
    setSesiones(recalcularNumerosSesion(base));
  }

  function eliminarSesion(fecha) {
    if (!fecha || !sesiones[fecha]) return;
    if (fecha === sesionActivaFecha) {
      alert('No puedes eliminar la sesión que está actualmente cargada.');
      return;
    }
    const sesion = sesiones[fecha];
    if (sesion.tipoSesion !== 'Extraordinaria') {
      alert('Las sesiones ordinarias no se pueden eliminar, solo editar. Si necesitas ajustarlas, usa vacaciones o asuetos en el calendario.');
      return;
    }
    const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
    const msg = tieneContenido
      ? `La sesión del ${fecha} tiene contenido. ¿Seguro que quieres eliminarla?`
      : `¿Eliminar la sesión del ${fecha}?`;
    if (!confirm(msg)) return;
    setSesiones(prev => {
      const copia = { ...prev };
      delete copia[fecha];
      return recalcularNumerosSesion(copia);
    });
  }

  // === FUNCIONES MODIFICADAS CON GUARD ===
  function moverPunto(id, direccion) {
    if (sesiones[sesionActivaFecha]?.listaCerrada) return;
    setSecciones(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;
      const nuevoIndex = index + direccion;
      if (nuevoIndex < 0 || nuevoIndex >= prev.length) return prev;
      if (prev[index].seccion !== prev[nuevoIndex].seccion) return prev;
      const copia = [...prev];
      [copia[index], copia[nuevoIndex]] = [copia[nuevoIndex], copia[index]];
      return copia;
    });
  }

  function eliminarPunto(id) {
    if (sesiones[sesionActivaFecha]?.listaCerrada) return;
    setSecciones(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1 || prev[index].fijo) return prev;
      const titulo = codigoPunto(index);    
      registrar('punto_eliminar', `Eliminó el punto ${titulo}`, `${prev[index].dependencia || ''} · "${resumenTexto(prev[index].contenido)}"`);
      return prev.filter(s => s.id !== id);
    });
  }

  function agregarPunto(datos) {
    if (sesiones[sesionActivaFecha]?.listaCerrada) return;
    const nuevoId = 'sec_' + Date.now();
    const nuevaSec = {
      id: nuevoId,
      clasificacion: 'Pleno',
      contenido: datos.contenido || 'Sin resumen',
      seccion: datos.seccion || seccionActual,
      subbloque: 'Pleno',
      fijo: false,
      anexo: (datos.archivos || []).length > 0,
      voto: 'Pendiente',
      tipoVotacion: datos.tipoVotacion || '',
      acuerdo: datos.acuerdo || '',
      anotaciones: '',
      aprobado: true,
      dependencia: datos.dependencia || 'Pleno',
      asunto: datos.asunto || '',
      archivos: datos.archivos || []
    };
    const insertIdx = getInsertIndex(secciones, nuevaSec.seccion);
    setSecciones(prev => {
      const idx = getInsertIndex(prev, nuevaSec.seccion);
      const copia = [...prev];
      copia.splice(idx, 0, nuevaSec);
      return copia;
    });
    registrar('punto_crear', `Creó el punto ${codigoPunto(insertIdx)}`, `${nuevaSec.seccion} · ${nuevaSec.dependencia} · "${resumenTexto(nuevaSec.contenido)}"`);
    return nuevoId;
  }

  function editarPuntoExistente(id, datos) {
    if (sesiones[sesionActivaFecha]?.listaCerrada) return;
    const idxGlobal = secciones.findIndex(s => s.id === id);
    const tituloPrevio = idxGlobal !== -1 ? codigoPunto(idxGlobal) : '';
    setSecciones(prev => prev.map(s => s.id === id ? {
      ...s,
      contenido: datos.contenido,
      dependencia: datos.dependencia,
      tipoVotacion: datos.tipoVotacion,
      acuerdo: datos.acuerdo,
      archivos: datos.archivos,
      anexo: (datos.archivos || []).length > 0 || s.anexo === true
    } : s));
    registrar('punto_editar', `Editó el punto ${tituloPrevio}`, `${datos.dependencia || ''} · "${resumenTexto(datos.contenido)}"`);
  }

  function toggleAnexo(id, valor) {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, anexo: valor } : s));
  }

  
  function agregarAsistente(datos) {
    if (asistentes.some(a => a.email === datos.email)) {
      alert('Ya existe un asistente con ese correo.');
      return;
    }
    setAsistentes(prev => {
      const nuevos = datos.presidente ? prev.map(a => ({ ...a, presidente: false })) : prev;
      return [...nuevos, { ...datos, presente: true }];
    });
  }
  function eliminarAsistente(idx) {
    setAsistentes(prev => prev.filter((_, i) => i !== idx));
  }
  function editarAsistente(idx, datos) {
    setAsistentes(prev => {
      let copia = prev;
      if (datos.presidente) {
        copia = copia.map((a, i) => i === idx ? a : { ...a, presidente: false });
      }
      return copia.map((a, i) => i === idx ? { ...a, ...datos } : a);
    });
  }
  function toggleAsistentePresente(idx, presente) {
    setAsistentes(prev => prev.map((a, i) => i === idx ? { ...a, presente } : a));
  }

  function actualizarPunto(id, cambios) {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, ...cambios } : s));
  }

  
  function agregarActa(tipo, fecha) {
    const contenido = `Aprobación, en su caso, del acta de la sesión ${tipo.toLowerCase()} del ${formatearFechaES(fecha)}.`;
    const nuevoId = 'sec_' + Date.now();
    const nuevaSec = {
      id: nuevoId, clasificacion: 'Pleno', contenido, seccion: 'aprobaciones', subbloque: 'Pleno',
      fijo: false, anexo: false, voto: 'Pendiente', anotaciones: '', aprobado: false,
      dependencia: 'Pleno', archivos: []
    };
    setSecciones(prev => {
      const insertIdx = getInsertIndex(prev, 'aprobaciones');
      const copia = [...prev];
      copia.splice(insertIdx, 0, nuevaSec);
      return copia;
    });
    setPuntoSeleccionadoId(nuevoId);
  }

  
  function crearSesionExtraordinaria(fecha) {
    const puntoOrdenDia = {
      id: 'sec_fijo_1',
      clasificacion: 'Pleno',
      contenido: 'Aprobación, en su caso, del orden del día.',
      seccion: 'aprobaciones',
      subbloque: 'Pleno',
      fijo: true,
      anexo: false,
      voto: 'Pendiente',
      anotaciones: '',
      aprobado: false,
      dependencia: 'Pleno',
      asunto: '',
      archivos: []
    };

    setSesiones(prev => {
      const nuevas = { 
        ...prev, 
        [fecha]: { 
          tipoSesion: 'Extraordinaria', 
          numeroSesion: 1, 
          secciones: [puntoOrdenDia], 
          asistentes: [] 
        } 
      };
      return recalcularNumerosSesion(nuevas);
    });

  // Actualizar estados locales
  setSesionActivaFecha(fecha);
  setProyectoMeta({ tipoSesion: 'Extraordinaria', numeroSesion: 1, fecha });
  setSecciones([puntoOrdenDia]);
  primeraVezRef.current = true;
}

  
  function adjuntarArchivoAPunto(id, archivo) {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, anexo: true, archivos: [...(s.archivos || []), archivo] } : s));
  }

  function setOneDriveFolder(datos) {
    setProyectoMeta(prev => ({ ...prev, ...datos }));
  }

  function toggleListaCerrada() {
    if (!sesionActivaFecha) return;
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      const nuevoEstado = !sesion.listaCerrada;
      return { ...prev, [sesionActivaFecha]: { ...sesion, listaCerrada: nuevoEstado } };
    });
    const sesionActual = sesiones[sesionActivaFecha];
    const seCierra = !sesionActual?.listaCerrada;
    const totalPuntos = secciones.length;
    registrar('lista', seCierra ? 'Cerró la lista de puntos' : 'Reabrió la lista de puntos', `${totalPuntos} punto${totalPuntos === 1 ? '' : 's'} en el orden del día`);
  }
  function comenzarSesionCelebracion() {
    if (!sesionActivaFecha) return;
    const ahora = Date.now();
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      return { ...prev, [sesionActivaFecha]: { ...sesion, horaInicio: ahora } };
    });
    registrar('sesion', 'Comenzó la sesión', new Date(ahora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  }
  function finalizarSesionCelebracion() {
    if (!sesionActivaFecha) return;
    const ahora = Date.now();
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      return { ...prev, [sesionActivaFecha]: { ...sesion, horaFin: ahora } };
    });
    registrar('sesion', 'Finalizó la sesión', new Date(ahora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  }
  function restablecerSesionCelebracion() {
    if (!sesionActivaFecha) return;
    if (!confirm('¿Restablecer esta celebración? Se borrarán las horas de inicio y fin.')) return;
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      const { horaInicio, horaFin, ...resto } = sesion;
      return { ...prev, [sesionActivaFecha]: resto };
    });
    registrar('sesion', 'Restableció la sesión', '');
  }
  function actualizarHoraInicioCelebracion(horaStr) {
    if (!sesionActivaFecha) return;
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      const base = sesion.horaInicio ? new Date(sesion.horaInicio) : parsearFechaLocal(sesionActivaFecha);
      const [h, m] = horaStr.split(':').map(Number);
      base.setHours(h, m, 0, 0);
      return { ...prev, [sesionActivaFecha]: { ...sesion, horaInicio: base.getTime() } };
    });
    registrar('sesion', 'Editó la hora de inicio', horaStr);
  }
  function actualizarHoraFinCelebracion(horaStr) {
    if (!sesionActivaFecha) return;
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      const base = sesion.horaFin ? new Date(sesion.horaFin) : parsearFechaLocal(sesionActivaFecha);
      const [h, m] = horaStr.split(':').map(Number);
      base.setHours(h, m, 0, 0);
      return { ...prev, [sesionActivaFecha]: { ...sesion, horaFin: base.getTime() } };
    });
    registrar('sesion', 'Editó la hora de fin', horaStr);
  }

  const { cuentaActiva } = useAuth();

  function registrar(categoria, accion, detalle = '') {
    registrarEvento({
      sesionFecha: sesionActivaFecha,
      usuarioNombre: cuentaActiva?.name || '',
      usuarioCorreo: cuentaActiva?.username || '',
      categoria,
      accion,
      detalle
    }).catch(err => console.error('No se pudo registrar el evento:', err));
  }
  function resumenTexto(texto, max = 60) {
    if (!texto) return '';
    const limpio = texto.replace(/\*\*/g, '');
    return limpio.length > max ? limpio.slice(0, max) + '…' : limpio;
  }
  function codigoPunto(idx) {
    return 'PLE/' + padNumber(idx + 1, 3);
  }

  const value = {
    secciones, setSecciones,
    sesiones, setSesiones,
    proyectoMeta, setProyectoMeta,
    sesionActivaFecha, setSesionActivaFecha,
    diaSesion, setDiaSesion,
    excepciones, setExcepciones,
    seccionActual, setSeccionActual,
    puntoSeleccionadoId, setPuntoSeleccionadoId,
    puntoEditandoId, setPuntoEditandoId,
    puntoPreviaSeleccionadoId, setPuntoPreviaSeleccionadoId,
    moverPunto, eliminarPunto, toggleAnexo, agregarPunto, editarPuntoExistente,
    cargarSesion, eliminarSesion, regenerarCalendario, agregarVacacion, agregarAsueto, eliminarExcepcion,
    asistentes, agregarAsistente, eliminarAsistente, editarAsistente, toggleAsistentePresente,
    actualizarPunto, agregarActa, crearSesionExtraordinaria, adjuntarArchivoAPunto, setOneDriveFolder,
    toggleListaCerrada, comenzarSesionCelebracion, finalizarSesionCelebracion, restablecerSesionCelebracion,
    actualizarHoraInicioCelebracion, actualizarHoraFinCelebracion
  };

  return <ProyectoContext.Provider value={value}>{children}</ProyectoContext.Provider>;
}

export function useProyecto() {
  const ctx = useContext(ProyectoContext);
  if (!ctx) throw new Error('useProyecto debe usarse dentro de <ProyectoProvider>');
  return ctx;
}