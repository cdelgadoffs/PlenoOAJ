import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  cargarSesiones, cargarProyectoMeta, cargarDesdeLocalStorage,
  cargarDiaSesion, cargarExcepciones, guardarEnLocalStorage,
  guardarSesiones as persistirSesiones, guardarProyectoMeta as persistirProyectoMeta,
  guardarDiaSesion as persistirDiaSesion, guardarExcepciones as persistirExcepciones
} from '../utils/storage.js';
import { conPuntosFijosAsegurados, conPunto2Actualizado, getInsertIndex } from '../utils/puntos.js';
import { calcularFechaAnterior, formatearFechaES, hoyLocalISO } from '../utils/fechas.js';
import {
  generarCalendarioAnual, aplicarExcepciones, limpiarSesionesInvalidas,
  recalcularNumerosSesion, obtenerProximaSesion, siguienteFechaSesion, esFechaSesionOrdinaria
} from '../utils/calendario.js';

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

  // Persiste secciones en localStorage cada vez que cambian (igual que
  // guardarEnLocalStorage() del original, llamado desde guardarEstadoActual).
  useEffect(() => {
    guardarEnLocalStorage(secciones);
  }, [secciones]);

  // Persiste sesiones/proyectoMeta/diaSesion/excepciones cada vez que cambian.
  useEffect(() => { persistirSesiones(sesiones); }, [sesiones]);
  useEffect(() => { persistirProyectoMeta(proyectoMeta); }, [proyectoMeta]);
  useEffect(() => { persistirDiaSesion(diaSesion); }, [diaSesion]);
  useEffect(() => { persistirExcepciones(excepciones); }, [excepciones]);

  // Sincroniza `secciones` (estado de trabajo) hacia sesiones[fecha activa],
  // igual que hacía guardarEstadoActual() en el original.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secciones]);

  // Renumera sesiones cada vez que cambia el mapa de sesiones o el día de
  // sesión configurado (igual que recalcularNumerosSesion()).
  useEffect(() => {
    setSesiones(prev => recalcularNumerosSesion(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaSesion]);

  // Carga una sesión por fecha: crea el registro si no existe, sincroniza
  // proyectoMeta y secciones. Migrado literalmente de cargarSesion().
  function cargarSesion(fecha) {
    if (!fecha) return;
    primeraVezRef.current = true; // evita re-sincronizar la sesión recién cargada sobre sí misma
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
      const conFijos = conPuntosFijosAsegurados(JSON.parse(JSON.stringify(data.secciones || [])));
      setSecciones(conPunto2Actualizado(conFijos, { tipoSesion: data.tipoSesion, numeroSesion: data.numeroSesion, fecha }, nuevas, calcularFechaAnterior, formatearFechaES));
      return nuevas;
    });
  }

  // Garantiza que exista calendario para el año actual y una sesión activa
  // cargada. Migrado de asegurarCalendarioDisponible() + el bloque de init().
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenera el calendario con un nuevo día de sesión (botón "Generar
  // calendario anual" del panel de calendarización).
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

  // Migrado literalmente de eliminarSesion().
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

  function moverPunto(id, direccion) {
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
    setSecciones(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1 || prev[index].fijo) return prev;
      return prev.filter(s => s.id !== id);
    });
  }

  function toggleAnexo(id, valor) {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, anexo: valor } : s));
  }

  function agregarPunto(datos) {
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
      aprobado: false,
      dependencia: datos.dependencia || 'Pleno',
      asunto: datos.asunto || '',
      archivos: datos.archivos || []
    };
    setSecciones(prev => {
      const insertIdx = getInsertIndex(prev, nuevaSec.seccion);
      const copia = [...prev];
      copia.splice(insertIdx, 0, nuevaSec);
      return copia;
    });
    return nuevoId;
  }

  function editarPuntoExistente(id, datos) {
    setSecciones(prev => prev.map(s => s.id === id ? {
      ...s,
      contenido: datos.contenido,
      dependencia: datos.dependencia,
      tipoVotacion: datos.tipoVotacion,
      acuerdo: datos.acuerdo,
      archivos: datos.archivos,
      anexo: (datos.archivos || []).length > 0 || s.anexo === true
    } : s));
  }

  // Migrado de agregarAsistente/eliminarAsistente/editarAsistente (Quórum).
  function agregarAsistente(datos) {
    if (!sesionActivaFecha) return;
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      const asistentes = sesion.asistentes || [];
      if (asistentes.some(a => a.email === datos.email)) {
        alert('Ya existe un asistente con ese correo.');
        return prev;
      }
      return { ...prev, [sesionActivaFecha]: { ...sesion, asistentes: [...asistentes, { ...datos, presente: true }] } };
    });
  }
  function eliminarAsistente(idx) {
    if (!sesionActivaFecha) return;
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      const asistentes = (sesion.asistentes || []).filter((_, i) => i !== idx);
      return { ...prev, [sesionActivaFecha]: { ...sesion, asistentes } };
    });
  }
  function editarAsistente(idx, datos) {
    if (!sesionActivaFecha) return;
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      const asistentes = (sesion.asistentes || []).map((a, i) => i === idx ? { ...a, ...datos } : a);
      return { ...prev, [sesionActivaFecha]: { ...sesion, asistentes } };
    });
  }
  function toggleAsistentePresente(idx, presente) {
    if (!sesionActivaFecha) return;
    setSesiones(prev => {
      const sesion = prev[sesionActivaFecha];
      if (!sesion) return prev;
      const asistentes = (sesion.asistentes || []).map((a, i) => i === idx ? { ...a, presente } : a);
      return { ...prev, [sesionActivaFecha]: { ...sesion, asistentes } };
    });
  }

  function actualizarPunto(id, cambios) {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, ...cambios } : s));
  }

  // Migrado de agregarActa() (modal "Aprobación del acta anterior").
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

  // Migrado de confirmarNuevoProyecto() (modal "Nueva sesión extraordinaria").
  function crearSesionExtraordinaria(fecha) {
    setSesiones(prev => {
      const nuevas = { ...prev, [fecha]: { tipoSesion: 'Extraordinaria', numeroSesion: 1, secciones: [], asistentes: [] } };
      return recalcularNumerosSesion(nuevas);
    });
    cargarSesion(fecha);
    setTimeout(() => {
      const contenidoActa = `Aprobación, en su caso, del acta de la sesión extraordinaria del ${formatearFechaES(fecha)}.`;
      setSecciones(prev => {
        const yaExiste = prev.some(s => s.contenido === contenidoActa && s.seccion === 'aprobaciones');
        if (yaExiste) return prev;
        const nuevoPunto = {
          id: 'sec_' + Date.now(), clasificacion: 'Pleno', contenido: contenidoActa, seccion: 'aprobaciones',
          subbloque: 'Pleno', fijo: false, anexo: false, voto: 'Pendiente', anotaciones: '', aprobado: false,
          dependencia: 'Pleno', asunto: 'Acta extraordinaria', archivos: []
        };
        const insertIdx = getInsertIndex(prev, 'aprobaciones');
        const copia = [...prev];
        copia.splice(insertIdx, 0, nuevoPunto);
        return copia;
      });
    }, 0);
  }

  // Migrado de adjuntarArchivoPunto() (modal "Adjuntar archivo").
  function adjuntarArchivoAPunto(id, archivo) {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, anexo: true, archivos: [...(s.archivos || []), archivo] } : s));
  }

  // Migrado de subirArchivosDelPuntoAOneDrive(): guarda referencia a la
  // carpeta del proyecto en OneDrive una vez creada, para reutilizarla.
  function setOneDriveFolder(datos) {
    setProyectoMeta(prev => ({ ...prev, ...datos }));
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
    agregarAsistente, eliminarAsistente, editarAsistente, toggleAsistentePresente,
    actualizarPunto, agregarActa, crearSesionExtraordinaria, adjuntarArchivoAPunto, setOneDriveFolder
  };

  return <ProyectoContext.Provider value={value}>{children}</ProyectoContext.Provider>;
}

export function useProyecto() {
  const ctx = useContext(ProyectoContext);
  if (!ctx) throw new Error('useProyecto debe usarse dentro de <ProyectoProvider>');
  return ctx;
}
