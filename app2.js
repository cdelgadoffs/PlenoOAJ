// ============================================================
// app.js – Lógica completa del generador de órdenes del día
// ============================================================

// ========== ESTADO ==========
let secciones = [];
let proyectoMeta = {
  tipoSesion: 'Ordinaria',
  numeroSesion: 1,
  fecha: ''
};
let seccionActual = 'aprobaciones';
let puntoSeleccionadoId = null;
let puntoPreviaSeleccionadoId = null;
let vistaActual = 'inicio';

let archivosTemporales = [];
let terminoBusqueda = '';

// === CALENDARIO Y SESIONES ===
let sesiones = {};
let diaSesion = 2;
let sesionActivaFecha = null;
let mesCintaActual = null;

const STORAGE_KEY = 'ordenDiaData';
const PROYECTO_META_KEY = 'proyectoMeta';
const SIDEBAR_DERECHO_KEY = 'sidebarDerechoOpen';
const NUEVO_SIDEBAR_KEY = 'nuevoSidebarOpen';
const SESIONES_KEY = 'sesiones';
const DIA_SESION_KEY = 'diaSesion';
const EXCEPCIONES_KEY = 'excepcionesCalendario';
let excepciones = { vacaciones: [], asuetos: [] };

const SECCIONES_DEL_DOCUMENTO = [
  'aprobaciones',
  'proyectos de acuerdo',
  'licencias',
  'informes',
  'asuntos generales'
];

// ========== PERSISTENCIA ==========
function cargarDesdeLocalStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}
function guardarEnLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(secciones));
}
function cargarProyectoMeta() {
  const data = localStorage.getItem(PROYECTO_META_KEY);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}
function guardarProyectoMeta() {
  localStorage.setItem(PROYECTO_META_KEY, JSON.stringify(proyectoMeta));
}
function cargarSesiones() {
  const data = localStorage.getItem(SESIONES_KEY);
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}
function guardarSesiones() {
  localStorage.setItem(SESIONES_KEY, JSON.stringify(sesiones));
}
function cargarDiaSesion() {
  const data = localStorage.getItem(DIA_SESION_KEY);
  if (data) {
    const d = parseInt(data, 10);
    if (d >= 1 && d <= 5) diaSesion = d;
  }
}
function guardarDiaSesion() {
  localStorage.setItem(DIA_SESION_KEY, String(diaSesion));
}

// ========== ROMANOS Y FORMATEO ==========
function toRoman(num) {
  const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV'];
  return roman[num-1] || num.toString();
}
function padNumber(num, length) {
  return String(num).padStart(length, '0');
}
function hoyLocalISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
function getTituloPunto(sec, idx) {
  const roman = toRoman(idx + 1);
  const num = idx + 1;
  const codigo = 'PLE/' + padNumber(num, 3);
  return roman + '. ' + codigo;
}
function parsearFechaLocal(fechaStr) {
  if (!fechaStr) return null;
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return new Date(fechaStr);
  const [anio, mes, dia] = partes.map(Number);
  return new Date(anio, mes - 1, dia);
}
function formatearFechaES(fechaStr) {
  if (!fechaStr) return '';
  const fecha = parsearFechaLocal(fechaStr);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const año = fecha.getFullYear();
  return `${dia} de ${mes} de ${año}`;
}
function calcularFechaAnterior(fechaStr, dias) {
  if (!fechaStr) return null;
  const fecha = parsearFechaLocal(fechaStr);
  fecha.setDate(fecha.getDate() - dias);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
function sumarDias(fechaStr, dias) {
  const fecha = parsearFechaLocal(fechaStr);
  fecha.setDate(fecha.getDate() + dias);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${d}`;
}
function siguienteFechaSesion(desdeStr) {
  let f = desdeStr;
  for (let i = 0; i < 21; i++) {
    const d = parsearFechaLocal(f);
    if (d.getDay() === diaSesion && !estaEnVacaciones(f)) return f;
    f = sumarDias(f, 1);
  }
  return desdeStr;
}
function asegurarCalendarioDisponible() {
  const anio = new Date().getFullYear();
  generarCalendarioAnual(anio);
  aplicarExcepciones();
  limpiarSesionesInvalidas();
  if (!obtenerProximaSesion()) {
    generarCalendarioAnual(anio + 1);
    aplicarExcepciones();
    limpiarSesionesInvalidas();
  }
}

// ========== EXCEPCIONES DEL CALENDARIO ==========
function cargarExcepciones() {
  const data = localStorage.getItem(EXCEPCIONES_KEY);
  if (!data) return { vacaciones: [], asuetos: [] };
  try {
    const parsed = JSON.parse(data);
    return { vacaciones: parsed.vacaciones || [], asuetos: parsed.asuetos || [] };
  } catch { return { vacaciones: [], asuetos: [] }; }
}
function guardarExcepciones() {
  localStorage.setItem(EXCEPCIONES_KEY, JSON.stringify(excepciones));
}
function estaEnVacaciones(fechaStr) {
  return excepciones.vacaciones.some(v => fechaStr >= v.inicio && fechaStr <= v.fin);
}
function resolverAsueto(fechaStr) {
  const a = excepciones.asuetos.find(a => a.fecha === fechaStr);
  return a ? a.destino : fechaStr;
}
function aplicarExcepciones() {
  let cambios = false;
  excepciones.vacaciones.forEach(v => {
    Object.keys(sesiones).forEach(f => {
      if (f < v.inicio || f > v.fin || f === sesionActivaFecha) return;
      const s = sesiones[f];
      const vacio = !s.secciones || !s.secciones.some(p => !p.fijo);
      if (vacio) { delete sesiones[f]; cambios = true; }
    });
  });
  excepciones.asuetos.forEach(a => {
    const s = sesiones[a.fecha];
    if (!s || a.fecha === sesionActivaFecha) return;
    const vacio = !s.secciones || !s.secciones.some(p => !p.fijo);
    if (!vacio) return;
    delete sesiones[a.fecha];
    if (!sesiones[a.destino] && !estaEnVacaciones(a.destino)) {
      sesiones[a.destino] = { tipoSesion: 'Ordinaria', numeroSesion: 1, secciones: [] };
    }
    cambios = true;
  });
  if (cambios) {
    guardarSesiones();
    recalcularNumerosSesion();
  }
}

// ========== NUMERACIÓN CONSECUTIVA DE SESIONES ==========
function recalcularNumerosSesion() {
  const hoy = hoyLocalISO();
  const porAnioTipo = {};

  Object.keys(sesiones).sort().forEach(f => {
    const anio = f.substring(0, 4);
    const sesion = sesiones[f];
    if (!sesion) return;

    const tipo = sesion.tipoSesion || 'Ordinaria';
    const clave = anio + '_' + tipo;

    const esPasada = f < hoy;
    const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
    const noCelebrada = esPasada && !tieneContenido;

    if (!porAnioTipo[clave]) porAnioTipo[clave] = 0;

    if (noCelebrada) {
      sesion.numeroSesion = null;
    } else {
      porAnioTipo[clave] += 1;
      sesion.numeroSesion = porAnioTipo[clave];
    }
  });

  guardarSesiones();

  if (sesionActivaFecha && sesiones[sesionActivaFecha]) {
    proyectoMeta.numeroSesion = sesiones[sesionActivaFecha].numeroSesion || 1;
    guardarProyectoMeta();
    actualizarTituloSidebar();
  }
}

// ========== MANEJO DE SESIONES ==========
function guardarEstadoActual() {
  if (!sesionActivaFecha) return;
  if (!sesiones[sesionActivaFecha]) {
    sesiones[sesionActivaFecha] = {
      tipoSesion: proyectoMeta.tipoSesion || 'Ordinaria',
      numeroSesion: proyectoMeta.numeroSesion || 1,
      secciones: []
    };
  }
  sesiones[sesionActivaFecha].tipoSesion = proyectoMeta.tipoSesion;
  sesiones[sesionActivaFecha].secciones = JSON.parse(JSON.stringify(secciones));
  guardarSesiones();
  recalcularNumerosSesion();
  if (window.fsSync) window.fsSync.sincronizarSesion(sesionActivaFecha);
}
function cargarSesion(fecha) {
  if (!fecha) return;
  sesionActivaFecha = fecha;
  if (!sesiones[fecha]) {
    const esOrdinaria = esFechaSesionOrdinaria(fecha);
    sesiones[fecha] = {
      tipoSesion: esOrdinaria ? 'Ordinaria' : 'Extraordinaria',
      numeroSesion: 1,
      secciones: []
    };
    guardarSesiones();
    recalcularNumerosSesion();
  }
  const data = sesiones[fecha];
  proyectoMeta.tipoSesion = data.tipoSesion;
  proyectoMeta.numeroSesion = data.numeroSesion || 1;
  proyectoMeta.fecha = fecha;
  secciones = JSON.parse(JSON.stringify(data.secciones));
  asegurarPuntosFijos();
  guardarProyectoMeta();
  guardarEnLocalStorage();
  actualizarTituloSidebar();
}
function esFechaSesionOrdinaria(fechaStr) {
  const fecha = parsearFechaLocal(fechaStr);
  if (!fecha) return false;
  const diaSemana = fecha.getDay();
  return diaSemana === diaSesion;
}
function limpiarSesionesInvalidas() {
  let hayCambios = false;
  Object.keys(sesiones).forEach(fecha => {
    const sesion = sesiones[fecha];
    if (!sesion || fecha === sesionActivaFecha) return;
    const sinAbrir = !sesion.secciones || sesion.secciones.length === 0;

    if (sesion.tipoSesion === 'Extraordinaria') {
      if (sinAbrir) { delete sesiones[fecha]; hayCambios = true; }
      return;
    }

    const fechaObj = parsearFechaLocal(fecha);
    if (!fechaObj || fechaObj.getDay() === diaSesion) return;
    const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
    if (tieneContenido) return;
    delete sesiones[fecha];
    hayCambios = true;
  });
  if (hayCambios) {
    guardarSesiones();
    recalcularNumerosSesion();
  }
}
function generarCalendarioAnual(anioParam) {
  const anio = anioParam || new Date().getFullYear();
  const fechaInicio = new Date(anio, 0, 1);
  const diaSemanaInicio = fechaInicio.getDay();
  let diff = diaSesion - diaSemanaInicio;
  if (diff < 0) diff += 7;
  fechaInicio.setDate(fechaInicio.getDate() + diff);

  const fechas = [];
  while (fechaInicio.getFullYear() === anio) {
    const y = fechaInicio.getFullYear();
    const m = String(fechaInicio.getMonth() + 1).padStart(2, '0');
    const d = String(fechaInicio.getDate()).padStart(2, '0');
    const fechaStr = `${y}-${m}-${d}`;
    if (!estaEnVacaciones(fechaStr)) {
      const destino = resolverAsueto(fechaStr);
      if (!estaEnVacaciones(destino)) fechas.push(destino);
    }
    fechaInicio.setDate(fechaInicio.getDate() + 7);
  }

  let hayCambios = false;
  fechas.forEach(fecha => {
    if (!sesiones[fecha]) {
      sesiones[fecha] = {
        tipoSesion: 'Ordinaria',
        numeroSesion: 1,
        secciones: []
      };
      hayCambios = true;
    } else {
      sesiones[fecha].tipoSesion = 'Ordinaria';
    }
  });

  if (hayCambios) {
    guardarSesiones();
    if (!sesionActivaFecha || !sesiones[sesionActivaFecha]) {
      const proxima = obtenerProximaSesion();
      if (proxima) cargarSesion(proxima);
    }
  }

  recalcularNumerosSesion();
  return fechas;
}
function obtenerProximaSesion() {
  const hoy = hoyLocalISO();
  const fechas = Object.keys(sesiones).sort();
  for (let f of fechas) {
    if (f >= hoy) return f;
  }
  return null;
}
function obtenerSesionesDelMes(month) {
  return Object.keys(sesiones).filter(f => f.startsWith(month)).sort();
}
function eliminarSesion(fecha) {
  if (!fecha) return;
  if (!sesiones[fecha]) return;
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
  if (tieneContenido) {
    if (!confirm(`La sesión del ${formatearFechaES(fecha)} tiene contenido. ¿Seguro que quieres eliminarla?`)) return;
  } else {
    if (!confirm(`¿Eliminar la sesión del ${formatearFechaES(fecha)}?`)) return;
  }
  const tipoEliminada = sesion.tipoSesion;
  delete sesiones[fecha];
  guardarSesiones();
  recalcularNumerosSesion();
  if (window.fsSync) window.fsSync.eliminarSesionArchivo(fecha, tipoEliminada);
  if (vistaActual === 'proyecto' || vistaActual === 'inicio') {
    renderCintaSesiones(mesCintaActual || fecha.substring(0, 7));
    inicializarControlAnual();
    if (vistaActual === 'proyecto') mostrarProyecto();
  }
  actualizarVistaCalendarizacion();
}

// ========== ACTUALIZAR PUNTO 2 ==========
function actualizarPunto2() {
  const punto2 = secciones.find(s => s.id === 'sec_fijo_2');
  if (!punto2) return;
  if (!proyectoMeta.fecha) return;
  const fechaAnterior = calcularFechaAnterior(proyectoMeta.fecha, 7);
  if (!fechaAnterior) return;

  const tipoActual = (proyectoMeta.tipoSesion || 'Ordinaria').toLowerCase();
  const actas = [`la sesión ${tipoActual} del ${formatearFechaES(fechaAnterior)}`];

  Object.keys(sesiones)
    .filter(f => sesiones[f].tipoSesion === 'Extraordinaria' && f > fechaAnterior && f < proyectoMeta.fecha)
    .sort()
    .forEach(f => actas.push(`la sesión extraordinaria del ${formatearFechaES(f)}`));

  const listado = actas.length === 1
    ? actas[0]
    : actas.slice(0, -1).join(', ') + ' y ' + actas[actas.length - 1];

  punto2.contenido = `Aprobación, en su caso, del acta${actas.length > 1 ? 's' : ''} de ${listado}.`;
  punto2.seccion = 'aprobaciones';
  punto2.clasificacion = 'Pleno';
  punto2.subbloque = 'Pleno';
  guardarEstadoActual();
}

// ========== ASEGURAR PUNTOS FIJOS ==========
function asegurarPuntosFijos() {
  const idsFijos = ['sec_fijo_1', 'sec_fijo_2', 'sec_fijo_3'];
  let necesitaGuardar = false;

  idsFijos.forEach(id => {
    if (!secciones.some(s => s.id === id)) {
      if (id === 'sec_fijo_1') {
        secciones.unshift({
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
          dependencia: '',
          asunto: '',
          archivos: []
        });
      } else if (id === 'sec_fijo_2') {
        secciones.splice(1, 0, {
          id: 'sec_fijo_2',
          clasificacion: 'Pleno',
          contenido: '',
          seccion: 'aprobaciones',
          subbloque: 'Pleno',
          fijo: true,
          anexo: false,
          voto: 'Pendiente',
          anotaciones: '',
          aprobado: true,
          dependencia: '',
          asunto: '',
          archivos: []
        });
      } else if (id === 'sec_fijo_3') {
        secciones.push({
          id: 'sec_fijo_3',
          clasificacion: 'Pleno',
          contenido: 'Asuntos generales.',
          seccion: 'asuntos generales',
          subbloque: 'Pleno',
          fijo: true,
          anexo: false,
          voto: 'Pendiente',
          anotaciones: '',
          aprobado: false,
          dependencia: '',
          asunto: '',
          archivos: []
        });
      }
      necesitaGuardar = true;
    } else {
      const idx = secciones.findIndex(s => s.id === id);
      if (idx !== -1) {
        const fijo = secciones[idx];
        fijo.fijo = true;
        fijo.clasificacion = 'Pleno';
        if (id === 'sec_fijo_3') {
          fijo.seccion = 'asuntos generales';
        } else {
          fijo.seccion = 'aprobaciones';
        }
        fijo.subbloque = 'Pleno';
        if (fijo.dependencia === undefined) fijo.dependencia = '';
        if (fijo.asunto === undefined) fijo.asunto = '';
        if (fijo.archivos === undefined) {
          fijo.archivos = [];
          necesitaGuardar = true;
        }
      }
    }
  });
  actualizarPunto2();
  reordenarAsuntosGenerales();
  if (necesitaGuardar) guardarEstadoActual();
}

// ========== REFERENCIAS DOM ==========
const navPrincipal = document.getElementById('navPrincipal');
const navSecundario = document.getElementById('navSecundario');
const navEsquema = document.getElementById('navEsquema');
const panelPrincipal = document.getElementById('panelPrincipal');
const totalBadge = document.getElementById('totalBadge');
const secSubtitle = document.getElementById('secSubtitle');
const terTitle = document.getElementById('terTitle');
const terSubtitle = document.getElementById('terSubtitle');
const btnAgregar = document.getElementById('btnAgregarSeccion');
const btnAprobarTodos = document.getElementById('btnAprobarTodos');
const secBadgeLabel = document.getElementById('secBadgeLabel');
const sidebarSecundario = document.getElementById('sidebarSecundario');
const sidebarTerciario = document.getElementById('sidebarTerciario');
const sidebarDerecho = document.getElementById('sidebarDerecho');
const btnToggleDerecho = document.getElementById('btnToggleDerecho');
const btnCerrarDerecho = document.getElementById('btnCerrarDerecho');
const btnNuevoProyecto = document.getElementById('btnNuevoProyecto');
const docTitleSidebar = document.getElementById('docTitleSidebar');
const docSubSidebar = document.getElementById('docSubSidebar');
const filtroDependenciaEsquema = document.getElementById('filtroDependenciaEsquema');
const buscadorGlobal = document.getElementById('buscadorGlobal');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const fechaActualEl = document.getElementById('fechaActual');

const cintaAnterior = document.getElementById('cintaAnterior');
const cintaSiguiente = document.getElementById('cintaSiguiente');
const cintaMesLabel = document.getElementById('cintaMesLabel');
const cintaFechas = document.getElementById('cintaFechas');

const controlMesSelect = document.getElementById('controlMesSelect');
const controlAnualLista = document.getElementById('controlAnualLista');

const sidebarNuevo = document.getElementById('sidebarNuevo');
const btnToggleNuevoSidebar = document.getElementById('btnToggleNuevoSidebar');
const panelMenuNuevo = document.getElementById('panelMenuNuevo');
const panelCalendarizacion = document.getElementById('panelCalendarizacion');
const panelEmailNuevo = document.getElementById('panelEmailNuevo');
const btnVolverMenuCalendario = document.getElementById('btnVolverMenuCalendario');
const btnVolverMenuNuevo = document.getElementById('btnVolverMenuNuevo');
const menuItemCalendarizacion = document.getElementById('menuItemCalendarizacion');
const menuItemEmail = document.getElementById('menuItemEmail');
const btnNuevoCalendario = document.getElementById('btnNuevoCalendario');

const panelCreacionCalendario = document.getElementById('panelCreacionCalendario');
const panelControlAnual = document.getElementById('panelControlAnual');
const confirmSobrescribir = document.getElementById('confirmSobrescribir');

const filtroDependencia = document.getElementById('filtroDependencia');
const listaDependencias = document.getElementById('listaDependencias');
const depSeleccionadaDisplay = document.getElementById('depSeleccionadaDisplay');
const asuntoSelect = document.getElementById('asuntoSelect');
const cuerpoTextarea = document.getElementById('cuerpoTextarea');
const btnConfirmarCreacion = document.getElementById('btnConfirmarCreacion');
const btnCancelarCreacion = document.getElementById('btnCancelarCreacion');
const formSeccionActual = document.getElementById('formSeccionActual');

const archivosInput = document.getElementById('archivosInput');
const btnAdjuntarArchivo = document.getElementById('btnAdjuntarArchivo');
const listaArchivosTemporales = document.getElementById('listaArchivosTemporales');
const oneDriveStatus = document.getElementById('oneDriveStatus');
const contenedorClasificaciones = document.getElementById('contenedorClasificaciones');

const modalPreview = document.getElementById('modalPrevisualizacion');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');
const btnCerrarPreview = document.getElementById('btnCerrarPreview');
const btnCerrarPreview2 = document.getElementById('btnCerrarPreview2');

const modalActa = document.getElementById('modalActa');
const actaTipoSesion = document.getElementById('actaTipoSesion');
const actaFecha = document.getElementById('actaFecha');
const actaConfirm = document.getElementById('actaConfirm');
const actaCancel = document.getElementById('actaCancel');

const modalNuevo = document.getElementById('modalNuevoProyecto');
const confirmCheckbox = document.getElementById('confirmNewProject');
const modalNuevoConfirm = document.getElementById('modalNuevoConfirm');
const modalNuevoCancel = document.getElementById('modalNuevoCancel');
const nuevoFecha = document.getElementById('nuevoFecha');

const diaSesionSelect = document.getElementById('diaSesionSelect');
const btnGenerarCalendario = document.getElementById('btnGenerarCalendario');
const calendarioStatus = document.getElementById('calendarioStatus');
const vacacionInicio = document.getElementById('vacacionInicio');
const vacacionFin = document.getElementById('vacacionFin');
const btnAgregarVacacion = document.getElementById('btnAgregarVacacion');
const listaVacaciones = document.getElementById('listaVacaciones');
const asuetoFecha = document.getElementById('asuetoFecha');
const asuetoOpciones = document.getElementById('asuetoOpciones');
const asuetoDestino = document.getElementById('asuetoDestino');
const btnAgregarAsueto = document.getElementById('btnAgregarAsueto');
const listaAsuetos = document.getElementById('listaAsuetos');

const cintaTituloSesion = document.getElementById('cintaTituloSesion');
const cintaSesionesWrap = document.getElementById('cintaSesionesWrap');

// ========== LISTA DE DEPENDENCIAS ==========
const TODAS_DEPENDENCIAS = [
  { id: 'Pleno', categoria: 'pleno' },
  { id: 'DGEJ', categoria: 'direcciones' },
  { id: 'DEGETD', categoria: 'direcciones' },
  { id: 'DGTI', categoria: 'direcciones' },
  { id: 'DGJJ', categoria: 'direcciones' },
  { id: 'DGIPDI', categoria: 'direcciones' },
  { id: 'DGRH', categoria: 'direcciones' },
  { id: 'Administración', categoria: 'comisiones' },
  { id: 'Creación de nuevos órganos', categoria: 'comisiones' },
  { id: 'Adscripción', categoria: 'comisiones' },
  { id: 'Carrera judicial', categoria: 'comisiones' },
  { id: 'Presupuesto', categoria: 'comisiones' }
];

let dependenciaSeleccionadaValor = '';

function renderizarListaDependencias(filtroCategoria) {
  const lista = listaDependencias;
  if (!lista) return;
  lista.innerHTML = '';
  let dependenciasFiltradas = TODAS_DEPENDENCIAS.filter(d => d.categoria === filtroCategoria);
  if (dependenciasFiltradas.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:8px; color:#999; font-size:12px; text-align:center;';
    empty.textContent = 'No hay dependencias en esta categoría.';
    lista.appendChild(empty);
    return;
  }
  dependenciasFiltradas.forEach(dep => {
    const div = document.createElement('div');
    div.className = 'dep-item';
    if (dep.id === dependenciaSeleccionadaValor) {
      div.classList.add('active');
    }
    div.textContent = dep.id;
    div.addEventListener('click', () => {
      dependenciaSeleccionadaValor = dep.id;
      depSeleccionadaDisplay.textContent = `Dependencia: ${dep.id}`;
      renderizarListaDependencias(filtroDependencia.value);
    });
    lista.appendChild(div);
  });
}

// ========== FUNCIONES AUXILIARES ==========
function getInsertIndex(seccion) {
  if (seccion === 'asuntos generales') {
    return secciones.length;
  }
  let lastIndex = -1;
  for (let i = 0; i < secciones.length; i++) {
    if (secciones[i].seccion === seccion) lastIndex = i;
  }
  if (lastIndex !== -1) return lastIndex + 1;
  return secciones.length;
}
function moverPunto(id, direccion) {
  // === NUEVO: verificar permiso ===
  if (!window.tieneRol('PuntosWrite') && !window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
    alert('No tienes permiso para mover puntos.');
    return;
  }
  const index = secciones.findIndex(s => s.id === id);
  if (index === -1) return;
  const nuevoIndex = index + direccion;
  if (nuevoIndex < 0 || nuevoIndex >= secciones.length) return;
  if (secciones[index].seccion !== secciones[nuevoIndex].seccion) return;
  [secciones[index], secciones[nuevoIndex]] = [secciones[nuevoIndex], secciones[index]];
  guardarEstadoActual();
  renderPanelPrincipal();
  actualizarBadgesYVisibilidad();
  renderSidebarDerecho();
  renderResumenClasificacion();
  poblarFiltroDependencias();
}
function reordenarAsuntosGenerales() {
  const generales = secciones.filter(s => s.seccion === 'asuntos generales');
  const otros = secciones.filter(s => s.seccion !== 'asuntos generales');
  secciones = [...otros, ...generales];
  guardarEstadoActual();
}

// ========== BÚSQUEDA ==========
function puntoCoincide(punto, termino) {
  if (!termino) return true;
  const term = termino.toLowerCase().trim();
  if (!term) return true;
  const idx = secciones.indexOf(punto);
  const titulo = getTituloPunto(punto, idx);
  const texto = (punto.contenido || '') + ' ' +
                (punto.dependencia || '') + ' ' +
                (punto.seccion || '') + ' ' +
                (punto.asunto || '') + ' ' +
                titulo;
  return texto.toLowerCase().includes(term);
}
function obtenerPuntosFiltrados() {
  if (!terminoBusqueda) return secciones.slice();
  return secciones.filter(p => puntoCoincide(p, terminoBusqueda));
}
function aplicarFiltro() {
  const term = buscadorGlobal.value.trim();
  terminoBusqueda = term;
  clearSearchBtn.style.display = term ? 'inline' : 'none';

  if (vistaActual === 'inicio') {
    mostrarInicio();
    renderResumenClasificacion();
  } else if (vistaActual === 'proyecto') {
    mostrarProyecto();
  } else if (vistaActual === 'sesionPrevia') {
    renderSesionPrevia();
  } else if (vistaActual === 'actaSesion') {
    renderActaSesion();
  }
}

// ========== RENDER DE SECCIONES EN SIDEBAR 2 ==========
function renderSecciones() {
  const nav = document.getElementById('navSecundario');
  if (!nav) return;
  nav.innerHTML = '';

  const puntosFiltrados = obtenerPuntosFiltrados();
  const idsFiltrados = new Set(puntosFiltrados.map(p => p.id));

  SECCIONES_DEL_DOCUMENTO.forEach(sec => {
    const puntosEnSeccion = secciones.filter(s => s.seccion === sec);
    const puntosFiltradosEnSeccion = puntosEnSeccion.filter(p => idsFiltrados.has(p.id));
    const conteo = puntosFiltradosEnSeccion.length;

    const div = document.createElement('div');
    div.className = 'nav-item';
    if (sec === seccionActual) div.classList.add('active');
    if (conteo === 0 && terminoBusqueda) {
      div.classList.add('disabled');
      div.style.display = 'none';
    }
    div.dataset.seccion = sec;

    const nombre = sec.charAt(0).toUpperCase() + sec.slice(1);

    div.innerHTML = `
      <span class="nav-dot"></span>
      <span class="sec-nombre">${nombre}</span>
      <span class="sec-badge">${conteo}</span>
    `;

    div.addEventListener('click', () => {
      if (conteo === 0 && terminoBusqueda) return;
      seccionActual = sec;
      const pts = secciones.filter(s => s.seccion === sec);
      puntoSeleccionadoId = pts.length > 0 ? pts[0].id : null;

      document.querySelectorAll('#navSecundario .nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.seccion === sec);
      });

      if (sec === 'asuntos generales') reordenarAsuntosGenerales();

      cerrarCreacion();
      renderPanelPrincipal();
      actualizarBadgesYVisibilidad();
      actualizarEstadoBotonesYBloques();
      renderSidebarDerecho();
    });

    nav.appendChild(div);
  });

  const totalFiltrados = puntosFiltrados.length;
  document.getElementById('secSubtitle').textContent =
    terminoBusqueda ? `${totalFiltrados} de ${secciones.length} coinciden` : `${SECCIONES_DEL_DOCUMENTO.length} secciones`;
}

// ========== RENDER DEL PANEL PRINCIPAL ==========
function renderPanelPrincipal() {
  const puntosFiltrados = obtenerPuntosFiltrados();
  const idsFiltrados = new Set(puntosFiltrados.map(p => p.id));

  if (terminoBusqueda) {
    if (puntosFiltrados.length === 0) {
      panelPrincipal.innerHTML = `
        <div class="placeholder-msg" style="margin-top:60px;">
          <strong>No se encontraron coincidencias</strong><br>
          Prueba con otro término.
        </div>
      `;
      return;
    }
    let html = `<div class="lista-puntos-expandida">`;
    puntosFiltrados.forEach(sec => {
      const idx = secciones.indexOf(sec);
      const titulo = getTituloPunto(sec, idx);
      const esFijo = sec.fijo === true;
      const tieneArchivos = sec.archivos && sec.archivos.length > 0;
      const anexoChecked = (tieneArchivos || sec.anexo === true) ? 'checked' : '';
      const numeroAnexo = idx + 1;
      const dependenciaMostrada = sec.dependencia || 'Pleno';
      const puedeSubir = idx > 0 && secciones[idx-1].seccion === sec.seccion;
      const puedeBajar = idx < secciones.length - 1 && secciones[idx+1].seccion === sec.seccion;

      let archivosHtml = '';
      if (tieneArchivos) {
        archivosHtml = `<div class="archivos-adjuntos">`;
        sec.archivos.forEach((a, idxArch) => {
          archivosHtml += `<span class="archivo-item" data-nombre="${a.nombre}" data-idx="${idxArch}">${a.nombre}</span>`;
        });
        archivosHtml += `</div>`;
      }

      html += `
        <div class="punto-card" data-id="${sec.id}">
          <div class="punto-card-header">
            <span class="punto-card-titulo">${titulo}</span>
            <span class="punto-card-badge">${dependenciaMostrada}</span>
          </div>
          <div class="punto-card-cuerpo">${sec.contenido || 'Sin contenido'}</div>
          ${archivosHtml}
          <div class="punto-card-acciones">
            <div class="checkbox-group">
              <input type="checkbox" id="anexo_${sec.id}" ${anexoChecked} />
              <label for="anexo_${sec.id}">Anexo ${numeroAnexo}</label>
            </div>
            <div class="botones">
              <button class="btn-adjuntar" id="btnAdjuntar_${sec.id}" title="Adjuntar archivo"><i class="fas fa-paperclip"></i></button>
              <button class="btn-mover" id="btnSubir_${sec.id}" ${!puedeSubir ? 'disabled' : ''}>▲</button>
              <button class="btn-mover" id="btnBajar_${sec.id}" ${!puedeBajar ? 'disabled' : ''}>▼</button>
              <button class="btn-eliminar" id="btnEliminar_${sec.id}" ${esFijo ? 'disabled' : ''}>
                ${esFijo ? 'Fijo' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    panelPrincipal.innerHTML = html;

    // Asignar eventos en modo búsqueda
    puntosFiltrados.forEach(sec => {
      const card = document.querySelector(`.punto-card[data-id="${sec.id}"]`);
      if (!card) return;

      card.addEventListener('click', function(e) {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label') || e.target.closest('.checkbox-group') || e.target.closest('.archivo-item')) return;
        if (puntoSeleccionadoId === sec.id) return;
        puntoSeleccionadoId = sec.id;
        seccionActual = sec.seccion;
        document.querySelectorAll('#navSecundario .nav-item').forEach(el => {
          el.classList.toggle('active', el.dataset.seccion === seccionActual);
        });
        renderPanelPrincipal();
        renderSidebarDerecho();
        actualizarBadgesYVisibilidad();
        actualizarEstadoBotonesYBloques();
      });

      const archivosItems = card.querySelectorAll('.archivo-item');
      archivosItems.forEach((item, idx) => {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          const archivo = sec.archivos[idx];
          if (archivo) abrirModalPrevisualizacion(archivo);
        });
      });

      const chk = document.getElementById('anexo_' + sec.id);
      if (chk) {
        chk.addEventListener('change', function() {
          sec.anexo = this.checked;
          guardarEstadoActual();
          renderSidebarDerecho();
        });
      }

      // Botón adjuntar
      document.getElementById('btnAdjuntar_' + sec.id)?.addEventListener('click', function(e) {
        e.stopPropagation();
        abrirModalAdjuntar(sec.id);
      });

      document.getElementById('btnSubir_' + sec.id)?.addEventListener('click', function() {
        moverPunto(sec.id, -1);
      });

      document.getElementById('btnBajar_' + sec.id)?.addEventListener('click', function() {
        moverPunto(sec.id, 1);
      });

      const btnEliminar = document.getElementById('btnEliminar_' + sec.id);
      if (btnEliminar && !sec.fijo) {
        btnEliminar.addEventListener('click', function() {
          // === NUEVO: verificar permiso ===
          if (!window.tieneRol('PuntosWrite') && !window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
            alert('No tienes permiso para eliminar puntos.');
            return;
          }
          if (confirm(`¿Eliminar "${getTituloPunto(sec, secciones.indexOf(sec))}"?`)) {
            const index = secciones.findIndex(s => s.id === sec.id);
            if (index > 0 && !secciones[index].fijo) {
              secciones.splice(index, 1);
              guardarEstadoActual();
              const ptsRestantes = secciones.filter(s => s.seccion === seccionActual);
              puntoSeleccionadoId = ptsRestantes.length > 0 ? ptsRestantes[0].id : null;
              renderPanelPrincipal();
              actualizarBadgesYVisibilidad();
              actualizarEstadoBotonesYBloques();
              renderSidebarDerecho();
              renderResumenClasificacion();
              poblarFiltroDependencias();
            }
          }
        });
      }
    });
    return;
  }

  // ===== SIN FILTRO: comportamiento original =====
  const pts = secciones.filter(s => s.seccion === seccionActual);
  const nombreSeccion = seccionActual.charAt(0).toUpperCase() + seccionActual.slice(1);

  if (pts.length === 0) {
    panelPrincipal.innerHTML = `
      <div class="placeholder-msg" style="margin-top:60px;">
        <strong>No hay puntos en ${nombreSeccion}</strong><br>
        Haz clic en el botón + para crear uno.
      </div>
    `;
    return;
  }

  let html = `<div class="lista-puntos-expandida">`;
  const sidebarAbierto = !sidebarTerciario.classList.contains('hidden');
  const ptsOrdenados = sidebarAbierto ? [...pts].reverse() : pts;
  ptsOrdenados.forEach(sec => {
    const idx = secciones.indexOf(sec);
    const titulo = getTituloPunto(sec, idx);
    const esFijo = sec.fijo === true;
    const puedeSubir = idx > 0 && secciones[idx-1].seccion === sec.seccion;
    const puedeBajar = idx < secciones.length - 1 && secciones[idx+1].seccion === sec.seccion;
    const tieneArchivos = sec.archivos && sec.archivos.length > 0;
    const anexoChecked = (tieneArchivos || sec.anexo === true) ? 'checked' : '';
    const numeroAnexo = idx + 1;
    const seleccionado = sec.id === puntoSeleccionadoId ? ' selected' : '';
    const dependenciaMostrada = sec.dependencia || 'Pleno';

    let archivosHtml = '';
    if (tieneArchivos) {
      archivosHtml = `<div class="archivos-adjuntos">`;
      sec.archivos.forEach((a, idxArch) => {
        archivosHtml += `<span class="archivo-item" data-nombre="${a.nombre}" data-idx="${idxArch}">${a.nombre}</span>`;
      });
      archivosHtml += `</div>`;
    }

    html += `
      <div class="punto-card${seleccionado}" data-id="${sec.id}">
        <div class="punto-card-header">
          <span class="punto-card-titulo">${titulo}</span>
          <span class="punto-card-badge">${dependenciaMostrada}</span>
        </div>
        <div class="punto-card-cuerpo">${sec.contenido || 'Sin contenido'}</div>
        ${archivosHtml}
        <div class="punto-card-acciones">
          <div class="checkbox-group">
            <input type="checkbox" id="anexo_${sec.id}" ${anexoChecked} />
            <label for="anexo_${sec.id}">Anexo ${numeroAnexo}</label>
          </div>
          <div class="botones">
            <button class="btn-adjuntar" id="btnAdjuntar_${sec.id}" title="Adjuntar archivo"><i class="fas fa-paperclip"></i></button>
            <button class="btn-mover" id="btnSubir_${sec.id}" ${!puedeSubir ? 'disabled' : ''}>▲</button>
            <button class="btn-mover" id="btnBajar_${sec.id}" ${!puedeBajar ? 'disabled' : ''}>▼</button>
            <button class="btn-eliminar" id="btnEliminar_${sec.id}" ${esFijo ? 'disabled' : ''}>
              ${esFijo ? 'Fijo' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  panelPrincipal.innerHTML = html;

  // Asignar eventos en modo normal
  pts.forEach(sec => {
    const card = document.querySelector(`.punto-card[data-id="${sec.id}"]`);
    if (!card) return;

    card.addEventListener('click', function(e) {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label') || e.target.closest('.checkbox-group') || e.target.closest('.archivo-item')) return;
      if (puntoSeleccionadoId === sec.id) return;
      puntoSeleccionadoId = sec.id;
      renderPanelPrincipal();
      renderSidebarDerecho();
    });

    const archivosItems = card.querySelectorAll('.archivo-item');
    archivosItems.forEach((item, idx) => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        const archivo = sec.archivos[idx];
        if (archivo) abrirModalPrevisualizacion(archivo);
      });
    });

    const chk = document.getElementById('anexo_' + sec.id);
    if (chk) {
      chk.addEventListener('change', function() {
        sec.anexo = this.checked;
        guardarEstadoActual();
        renderSidebarDerecho();
      });
    }

    // Botón adjuntar
    document.getElementById('btnAdjuntar_' + sec.id)?.addEventListener('click', function(e) {
      e.stopPropagation();
      abrirModalAdjuntar(sec.id);
    });

    document.getElementById('btnSubir_' + sec.id)?.addEventListener('click', function() {
      moverPunto(sec.id, -1);
    });

    document.getElementById('btnBajar_' + sec.id)?.addEventListener('click', function() {
      moverPunto(sec.id, 1);
    });

    const btnEliminar = document.getElementById('btnEliminar_' + sec.id);
    if (btnEliminar && !sec.fijo) {
      btnEliminar.addEventListener('click', function() {
        // === NUEVO: verificar permiso ===
        if (!window.tieneRol('PuntosWrite') && !window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
          alert('No tienes permiso para eliminar puntos.');
          return;
        }
        if (confirm(`¿Eliminar "${getTituloPunto(sec, secciones.indexOf(sec))}"?`)) {
          const index = secciones.findIndex(s => s.id === sec.id);
          if (index > 0 && !secciones[index].fijo) {
            secciones.splice(index, 1);
            guardarEstadoActual();
            const ptsRestantes = secciones.filter(s => s.seccion === seccionActual);
            puntoSeleccionadoId = ptsRestantes.length > 0 ? ptsRestantes[0].id : null;
            renderPanelPrincipal();
            actualizarBadgesYVisibilidad();
            actualizarEstadoBotonesYBloques();
            renderSidebarDerecho();
            renderResumenClasificacion();
            poblarFiltroDependencias();
          }
        }
      });
    }
  });
}

// ========== SIDEBAR TERCIARIO: CREACIÓN ==========
function abrirCreacion() {
  // === NUEVO: verificar permiso ===
  if (!window.tieneRol('PuntosWrite') && !window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
    alert('No tienes permiso para crear puntos.');
    return;
  }
  if (secciones.length === 0) {
    alert('Primero genera un proyecto.');
    return;
  }
  if (seccionActual === 'asuntos generales') {
    alert('No se pueden agregar puntos a Asuntos generales.');
    return;
  }
  if (seccionActual === 'aprobaciones') {
    abrirModalActa();
    return;
  }
  sidebarTerciario.classList.remove('hidden');
  formSeccionActual.textContent = seccionActual.charAt(0).toUpperCase() + seccionActual.slice(1);

  archivosTemporales = [];
  actualizarListaArchivosTemporales();
  if (oneDriveStatus) {
    oneDriveStatus.textContent = '';
    oneDriveStatus.className = 'onedrive-status';
  }

  if (!filtroDependencia.value) {
    filtroDependencia.value = 'pleno';
  }
  depSeleccionadaDisplay.textContent = dependenciaSeleccionadaValor
    ? `Dependencia: ${dependenciaSeleccionadaValor}`
    : 'Ninguna seleccionada';
  cuerpoTextarea.value = '';
  renderizarListaDependencias(filtroDependencia.value);
  cuerpoTextarea.focus();
  btnAgregar.disabled = true;
  renderPanelPrincipal();

  // Activar modo formulario en la cinta de sesiones
  if (cintaSesionesWrap) {
    cintaSesionesWrap.classList.add('modo-formulario');
  }
  if (cintaTituloSesion) {
    const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
    const numero = proyectoMeta.numeroSesion || 1;
    cintaTituloSesion.textContent = `Sesión ${tipo} N° ${numero}`;
    cintaTituloSesion.style.display = 'block';
  }
}
function cerrarCreacion() {
  sidebarTerciario.classList.add('hidden');
  btnAgregar.disabled = false;
  renderPanelPrincipal();

  // Desactivar modo formulario en la cinta de sesiones
  if (cintaSesionesWrap) {
    cintaSesionesWrap.classList.remove('modo-formulario');
  }
  if (cintaTituloSesion) {
    cintaTituloSesion.style.display = 'none';
  }
}
function agregarPunto() {
  // === NUEVO: verificar permiso ===
  if (!window.tieneRol('PuntosWrite') && !window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
    alert('No tienes permiso para agregar puntos.');
    return;
  }
  const contenido = cuerpoTextarea.value.trim() || 'Sin resumen';
  const dependencia = dependenciaSeleccionadaValor || 'Sin dependencia';
  const asunto = asuntoSelect.value;
  const seccion = seccionActual;
  const nuevoId = 'sec_' + Date.now();
  const nuevaSec = {
    id: nuevoId,
    clasificacion: 'Pleno',
    contenido: contenido,
    seccion: seccion,
    subbloque: 'Pleno',
    fijo: false,
    anexo: archivosTemporales.length > 0,
    voto: 'Pendiente',
    anotaciones: '',
    aprobado: false,
    dependencia: dependencia,
    asunto: asunto,
    archivos: [...archivosTemporales]
  };
  const insertIdx = getInsertIndex(seccion);
  secciones.splice(insertIdx, 0, nuevaSec);
  guardarEstadoActual();
  puntoSeleccionadoId = nuevoId;
  cuerpoTextarea.value = '';
  archivosTemporales = [];
  actualizarListaArchivosTemporales();
  cuerpoTextarea.focus();
  renderPanelPrincipal();
  actualizarBadgesYVisibilidad();
  renderSidebarDerecho();
  renderResumenClasificacion();
  poblarFiltroDependencias();

  if (nuevaSec.archivos.length > 0) {
    subirArchivosDelPuntoAOneDrive(nuevaSec, insertIdx);
  }
}
async function subirArchivosDelPuntoAOneDrive(sec, posicionGlobal) {
  if (!proyectoMeta.oneDriveFolderId) {
    if (oneDriveStatus) {
      oneDriveStatus.textContent = 'Vinculando carpeta del proyecto en OneDrive...';
      oneDriveStatus.className = 'onedrive-status subiendo';
    }
    try {
      const fechaFormateadaCarpeta = formatearFechaES(proyectoMeta.fecha);
      const nombreCarpetaProyecto = `Sesión ${proyectoMeta.tipoSesion} ${proyectoMeta.numeroSesion} del Pleno ${fechaFormateadaCarpeta}`;
      const anioSesion = (proyectoMeta.fecha || '').split('-')[0];
      const carpetaProyecto = await window.oneDrive.crearCarpetaProyecto(nombreCarpetaProyecto, anioSesion);
      proyectoMeta.oneDriveFolderId = carpetaProyecto.id;
      proyectoMeta.oneDriveFolderNombre = nombreCarpetaProyecto;
      proyectoMeta.oneDriveFolderUrl = carpetaProyecto.webUrl || '';
      guardarProyectoMeta();
      if (oneDriveStatus) {
        oneDriveStatus.textContent = 'Carpeta del proyecto vinculada.';
        oneDriveStatus.className = 'onedrive-status ok';
      }
    } catch (err) {
      console.error('No se pudo vincular la carpeta del proyecto en OneDrive:', err);
      if (oneDriveStatus) {
        oneDriveStatus.textContent = 'No se pudo crear/vincular la carpeta del proyecto en OneDrive.';
        oneDriveStatus.className = 'onedrive-status error';
      }
      return;
    }
  }
  const nombreCarpetaPunto = `Punto de acuerdo ${posicionGlobal + 1}`;
  if (oneDriveStatus) {
    oneDriveStatus.textContent = `Subiendo archivos a OneDrive (${nombreCarpetaPunto})...`;
    oneDriveStatus.className = 'onedrive-status subiendo';
  }
  try {
    const carpetaPunto = await window.oneDrive.crearCarpetaPunto(proyectoMeta.oneDriveFolderId, nombreCarpetaPunto);
    let errores = 0;
    for (const archivo of sec.archivos) {
      try {
        const subido = await window.oneDrive.subirArchivoAOneDrive(carpetaPunto.id, archivo.nombre, archivo.data, archivo.tipo);
        archivo.oneDriveId = subido.id;
        archivo.oneDriveUrl = subido.webUrl || '';
        console.log(`Archivo "${archivo.nombre}" subido exitosamente.`);
      } catch (errArchivo) {
        errores++;
        console.error(`No se pudo subir "${archivo.nombre}" a OneDrive:`, errArchivo);
      }
    }
    guardarEstadoActual();
    if (oneDriveStatus) {
      if (errores === 0) {
        oneDriveStatus.textContent = `Archivos subidos a OneDrive (${nombreCarpetaPunto}).`;
        oneDriveStatus.className = 'onedrive-status ok';
      } else {
        oneDriveStatus.textContent = `${errores} archivo(s) no se pudieron subir a OneDrive. Revisa la consola.`;
        oneDriveStatus.className = 'onedrive-status error';
      }
    }
  } catch (err) {
    console.error('No se pudo crear la carpeta del punto en OneDrive:', err);
    if (oneDriveStatus) {
      oneDriveStatus.textContent = 'No se pudo subir a OneDrive. Verifica los permisos de Files.ReadWrite en Azure.';
      oneDriveStatus.className = 'onedrive-status error';
    }
  }
}

// ========== FUNCIONES PARA ARCHIVOS ADJUNTOS ==========
function adjuntarArchivos() {
  // === NUEVO: verificar permiso ===
  if (!window.tieneRol('PuntosWrite') && !window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
    alert('No tienes permiso para adjuntar archivos.');
    return;
  }
  const files = archivosInput.files;
  if (files.length === 0) return;
  const readerPromises = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > 1024 * 1024) {
      alert(`El archivo ${file.name} excede 1MB y no será adjuntado.`);
      continue;
    }
    const promise = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        resolve({ nombre: file.name, tipo: file.type, data: e.target.result });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    readerPromises.push(promise);
  }
  if (readerPromises.length === 0) return;
  Promise.all(readerPromises).then(results => {
    archivosTemporales.push(...results);
    archivosInput.value = '';
    actualizarListaArchivosTemporales();
  }).catch(err => {
    alert('Error al leer archivos: ' + err.message);
  });
}
function eliminarArchivoTemporal(index) {
  if (index >= 0 && index < archivosTemporales.length) {
    archivosTemporales.splice(index, 1);
    actualizarListaArchivosTemporales();
  }
}
function actualizarListaArchivosTemporales() {
  const container = listaArchivosTemporales;
  if (archivosTemporales.length === 0) {
    container.innerHTML = '<span style="color:#aaa;">Ningún archivo adjunto</span>';
    return;
  }
  container.innerHTML = archivosTemporales.map((a, idx) => {
    return `<span class="archivo-item-temp">${a.nombre} <span class="eliminar-archivo-temp" data-index="${idx}">✕</span></span>`;
  }).join(' ');
  container.querySelectorAll('.eliminar-archivo-temp').forEach(el => {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      const index = parseInt(this.dataset.index);
      eliminarArchivoTemporal(index);
    });
  });
}

// ========== PREVISUALIZACIÓN DE ARCHIVOS ==========
function descargarArchivo(archivo) {
  const link = document.createElement('a');
  link.href = archivo.data;
  link.download = archivo.nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function abrirModalPrevisualizacion(archivo) {
  previewTitle.textContent = archivo.nombre;
  const content = previewContent;
  content.innerHTML = '';

  const tieneVistaPrevia = archivo.tipo.startsWith('image/') ||
                           archivo.tipo === 'application/pdf' ||
                           archivo.tipo.startsWith('text/');

  const modalContent = modalPreview.querySelector('.modal-content');
  if (tieneVistaPrevia) {
    modalContent.classList.add('modal-preview-full');
    modalContent.classList.remove('modal-preview-compact');
  } else {
    modalContent.classList.add('modal-preview-compact');
    modalContent.classList.remove('modal-preview-full');
  }

  if (archivo.tipo.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = archivo.data;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '80vh';
    content.appendChild(img);
  } else if (archivo.tipo === 'application/pdf') {
    const embed = document.createElement('embed');
    embed.src = archivo.data;
    embed.type = 'application/pdf';
    embed.style.width = '100%';
    embed.style.height = '80vh';
    content.appendChild(embed);
  } else if (archivo.tipo.startsWith('text/')) {
    const pre = document.createElement('pre');
    try {
      const base64 = archivo.data.split(',')[1];
      const texto = atob(base64);
      pre.textContent = texto;
    } catch (e) {
      pre.textContent = 'No se pudo decodificar el texto.';
    }
    pre.style.textAlign = 'left';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.maxHeight = '70vh';
    pre.style.overflow = 'auto';
    pre.style.background = '#f5f5f5';
    pre.style.padding = '10px';
    content.appendChild(pre);
  } else {
    content.innerHTML = `
      <p style="margin-bottom: 16px;">No se puede mostrar vista previa de este tipo de archivo (${archivo.tipo}).</p>
      <button id="btnDescargarArchivo" class="btn-confirm" style="padding: 8px 24px; font-size: 14px;">Descargar archivo</button>
    `;
    document.getElementById('btnDescargarArchivo').addEventListener('click', function() {
      const link = document.createElement('a');
      link.href = archivo.data;
      link.download = archivo.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  modalPreview.classList.add('active');
}
function cerrarModalPrevisualizacion() {
  modalPreview.classList.remove('active');
  previewContent.innerHTML = '';
  const modalContent = modalPreview.querySelector('.modal-content');
  modalContent.classList.remove('modal-preview-full', 'modal-preview-compact');
}

// ========== POBLAR FILTRO DE DEPENDENCIAS ==========
function poblarFiltroDependencias() {
  const select = filtroDependenciaEsquema;
  if (!select) return;
  const valorActual = select.value;
  const dependencias = new Set();
  secciones.forEach(sec => {
    if (sec.dependencia && sec.dependencia.trim() !== '') {
      dependencias.add(sec.dependencia.trim());
    }
  });
  const lista = Array.from(dependencias).sort((a, b) => a.localeCompare(b));

  select.innerHTML = '<option value="">Todas las dependencias</option>';
  lista.forEach(dep => {
    const opt = document.createElement('option');
    opt.value = dep;
    opt.textContent = dep;
    select.appendChild(opt);
  });

  if (valorActual && lista.includes(valorActual)) {
    select.value = valorActual;
  } else {
    select.value = '';
  }
}

// ========== RESUMEN DE CLASIFICACIONES ==========
function renderResumenClasificacion() {
  const container = contenedorClasificaciones;
  if (!container) return;
  const puntos = obtenerPuntosFiltrados();
  if (puntos.length === 0) {
    container.innerHTML = '<span style="color:#aaa;">Sin puntos</span>';
    return;
  }
  const conteo = {};
  puntos.forEach(sec => {
    const cls = sec.clasificacion || 'Sin clasificar';
    conteo[cls] = (conteo[cls] || 0) + 1;
  });
  let html = '';
  for (const [clas, num] of Object.entries(conteo)) {
    html += `<div class="clasificacion-item"><span class="clas-nombre">${clas}</span><span class="clas-conteo">${num}</span></div>`;
  }
  container.innerHTML = html;
}

// ========== CALENDARIZACIÓN: ACTUALIZAR VISTA ==========
function actualizarVistaCalendarizacion() {
  if (!panelCreacionCalendario || !panelControlAnual) return;
  const haySesiones = Object.keys(sesiones).length > 0;

  if (haySesiones && !window.formularioActivo) {
    panelControlAnual.style.display = 'block';
    panelCreacionCalendario.style.display = 'none';
  } else if (!haySesiones) {
    panelCreacionCalendario.style.display = 'block';
    panelControlAnual.style.display = 'none';
    window.formularioActivo = true;
  } else {
    panelCreacionCalendario.style.display = 'block';
    panelControlAnual.style.display = 'none';
  }

  if (panelControlAnual.style.display !== 'none') {
    inicializarControlAnual();
  }
}

function toggleFormularioCalendario() {
  if (!panelCreacionCalendario || !panelControlAnual) return;
  const haySesiones = Object.keys(sesiones).length > 0;
  if (panelCreacionCalendario.style.display === 'none' || !panelCreacionCalendario.style.display) {
    panelCreacionCalendario.style.display = 'block';
    panelControlAnual.style.display = 'none';
    window.formularioActivo = true;
    if (confirmSobrescribir) confirmSobrescribir.checked = true;
  } else {
    panelCreacionCalendario.style.display = 'none';
    window.formularioActivo = false;
    if (haySesiones) {
      panelControlAnual.style.display = 'block';
      inicializarControlAnual();
    } else {
      panelControlAnual.style.display = 'none';
    }
  }
}

// ========== CINTA DE SESIONES MEJORADA ==========
function renderCintaSesiones(month) {
  const wrap = document.getElementById('cintaSesionesWrap');
  if (!wrap) return;

  if (!month) {
    if (sesionActivaFecha) {
      month = sesionActivaFecha.substring(0, 7);
    } else {
      month = hoyLocalISO().substring(0, 7);
    }
  }
  mesCintaActual = month;

  const fechas = obtenerSesionesDelMes(month);
  const container = cintaFechas;
  container.innerHTML = '';

  const [anio, mes] = month.split('-');
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  cintaMesLabel.textContent = `${meses[parseInt(mes)-1]} ${anio}`;

  if (fechas.length === 0) {
    container.innerHTML = '<div style="padding:4px 0; color:#999; font-size:12px;">No hay sesiones en este mes</div>';
    wrap.classList.remove('hidden');
    return;
  }

  const hoy = hoyLocalISO();
  let proximaGlobal = null;
  for (let f of Object.keys(sesiones).sort()) {
    if (f >= hoy) { proximaGlobal = f; break; }
  }

  fechas.forEach(f => {
    const sesion = sesiones[f];
    if (!sesion) return;

    const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
    const totalPuntos = sesion.secciones ? sesion.secciones.length : 0;
    const puntosPropios = sesion.secciones ? sesion.secciones.filter(s => !s.fijo).length : 0;
    const esSeleccionada = f === sesionActivaFecha;

    let clase = 'badge-sesion';
    let estado = '';
    if (f === proximaGlobal) {
      clase += ' proxima';
      estado = 'Próxima';
    } else if (f < hoy) {
      clase += tieneContenido ? ' celebrada' : ' no-celebrada';
      estado = tieneContenido ? 'Celebrada' : 'No celebrada';
    } else {
      clase += ' pendiente';
      estado = 'Pendiente';
    }
    if (esSeleccionada) clase += ' activa-seleccionada';
    if (sesion.tipoSesion === 'Extraordinaria') clase += ' extraordinaria';

    const diaLabel = formatearFechaCorta(f);
    const numero = sesion.numeroSesion;
    const numeroTexto = numero ? ('N° ' + numero) : '(no celebrada)';
    const tipoSesionLabel = sesion.tipoSesion || 'Ordinaria';
    const label = esSeleccionada
      ? (diaLabel + ' - Sesión ' + tipoSesionLabel + ' ' + numeroTexto)
      : diaLabel;

    const tooltip = tipoSesionLabel + ' · ' + totalPuntos + ' puntos (' + puntosPropios + ' propios) · ' + estado;

    const span = document.createElement('span');
    span.className = clase;
    span.dataset.fecha = f;
    span.textContent = label;
    span.title = tooltip;

    span.addEventListener('click', function() {
      const fecha = this.dataset.fecha;
      if (fecha) {
        cargarSesion(fecha);
        renderCintaSesiones(fecha.substring(0, 7));
        if (vistaActual === 'proyecto') mostrarProyecto();
        else if (vistaActual === 'inicio') mostrarInicio();
        actualizarControlAnual();
      }
    });

    container.appendChild(span);
  });

  wrap.classList.remove('hidden');
}
function formatearFechaCorta(fechaStr) {
  const fecha = parsearFechaLocal(fechaStr);
  return `Día ${fecha.getDate()}`;
}
function cintaAnteriorMes() {
  if (!mesCintaActual) {
    mesCintaActual = hoyLocalISO().substring(0, 7);
  }
  const [anio, mes] = mesCintaActual.split('-').map(Number);
  let nuevoMes = mes - 1;
  let nuevoAnio = anio;
  if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
  const nuevoMesStr = `${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`;
  renderCintaSesiones(nuevoMesStr);
}
function cintaSiguienteMes() {
  if (!mesCintaActual) {
    mesCintaActual = hoyLocalISO().substring(0, 7);
  }
  const [anio, mes] = mesCintaActual.split('-').map(Number);
  let nuevoMes = mes + 1;
  let nuevoAnio = anio;
  if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
  const nuevoMesStr = `${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`;
  renderCintaSesiones(nuevoMesStr);
}

// ========== CONTROL ANUAL ==========
function inicializarControlAnual() {
  if (!controlMesSelect) return;
  const mesesSet = new Set();
  Object.keys(sesiones).forEach(f => {
    mesesSet.add(f.substring(0, 7));
  });
  const hoy = hoyLocalISO().substring(0, 7);
  mesesSet.add(hoy);
  const [anio, mes] = hoy.split('-').map(Number);
  let sigMes = mes + 1;
  let sigAnio = anio;
  if (sigMes > 12) { sigMes = 1; sigAnio++; }
  mesesSet.add(`${sigAnio}-${String(sigMes).padStart(2, '0')}`);

  const mesesOrd = Array.from(mesesSet).sort();
  controlMesSelect.innerHTML = '';
  mesesOrd.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    const [a, me] = m.split('-');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    opt.textContent = `${meses[parseInt(me)-1]} ${a}`;
    controlMesSelect.appendChild(opt);
  });

  let mesSeleccionado = sesionActivaFecha ? sesionActivaFecha.substring(0, 7) : hoy;
  if (mesesSet.has(mesSeleccionado)) {
    controlMesSelect.value = mesSeleccionado;
  } else {
    controlMesSelect.value = hoy;
  }
  renderControlAnual(controlMesSelect.value);
}
function renderControlAnual(month) {
  if (!controlAnualLista) return;
  if (!month) {
    month = controlMesSelect.value || hoyLocalISO().substring(0, 7);
  }
  const fechas = obtenerSesionesDelMes(month);
  const container = controlAnualLista;
  container.innerHTML = '';

  const hoy = hoyLocalISO();
  let proximaGlobal = null;
  for (let f of Object.keys(sesiones).sort()) {
    if (f >= hoy) { proximaGlobal = f; break; }
  }

  if (fechas.length === 0) {
    container.innerHTML = '<div class="email-vacio">No hay sesiones en este mes</div>';
    const resumen = document.getElementById('controlResumen');
    if (resumen) resumen.innerHTML = '';
    return;
  }

  let totalPuntos = 0;
  let totalSesiones = fechas.length;
  let celebradas = 0;
  fechas.forEach(f => {
    const sesion = sesiones[f];
    if (!sesion) return;
    const pts = sesion.secciones ? sesion.secciones.length : 0;
    totalPuntos += pts;
    if (f < hoy && sesion.secciones && sesion.secciones.some(s => !s.fijo)) celebradas++;
  });

  let resumenHtml = `<div class="control-resumen">
    <span>Sesiones: ${totalSesiones}</span>
    <span>Puntos totales: ${totalPuntos}</span>
    <span>Celebradas: ${celebradas}</span>
  </div>`;
  const resumenDiv = document.getElementById('controlResumen');
  if (resumenDiv) resumenDiv.innerHTML = resumenHtml;

  fechas.forEach(f => {
    const sesion = sesiones[f];
    if (!sesion) return;
    const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
    const totalPts = sesion.secciones ? sesion.secciones.length : 0;
    const ptsPropios = sesion.secciones ? sesion.secciones.filter(s => !s.fijo).length : 0;
    const esSeleccionada = f === sesionActivaFecha;
    const puedeEliminar = sesion.tipoSesion === 'Extraordinaria';
    const numero = sesion.numeroSesion;
    const numeroTexto = numero ? `N° ${numero}` : '(no celebrada)';

    let estado = '';
    let clase = 'control-item';
    if (f === proximaGlobal) {
      clase += ' proxima';
      estado = 'Próxima';
    } else if (f < hoy) {
      clase += tieneContenido ? ' celebrada' : ' no-celebrada';
      estado = tieneContenido ? 'Celebrada' : 'No celebrada';
    } else {
      clase += ' pendiente';
      estado = 'Pendiente';
    }
    if (esSeleccionada) clase += ' seleccionada';

    const tituloEliminar = puedeEliminar
      ? 'Eliminar sesión'
      : 'Las sesiones ordinarias no se pueden eliminar, solo editar';

    const div = document.createElement('div');
    div.className = clase;

    if (esSeleccionada) {
      div.innerHTML = `
        <div class="control-item-expandido">
          <div class="control-expandido-header">
            <span class="control-expandido-titulo">Sesión ${sesion.tipoSesion} ${numeroTexto}</span>
            <span class="control-expandido-estado">${estado}</span>
          </div>
          <div class="control-expandido-fecha">${formatearFechaES(f)}</div>
          <div class="control-expandido-detalle">
            <span>${totalPts} puntos totales</span>
            <span>${ptsPropios} propios</span>
          </div>
          <div class="control-expandido-acciones">
            <button class="btn-eliminar-sesion" data-fecha="${f}" title="${tituloEliminar}" ${puedeEliminar ? '' : 'disabled'}>✕ Eliminar</button>
          </div>
        </div>
      `;
    } else {
      div.innerHTML = `
        <span class="control-fecha">Sesión ${sesion.tipoSesion} ${numeroTexto}</span>
        <span class="control-tipo">${formatearFechaCorta(f)}</span>
        <span class="control-puntos">${totalPts} pts</span>
        <span class="control-estado">${estado}</span>
        <button class="btn-eliminar-sesion" data-fecha="${f}" title="${tituloEliminar}" ${puedeEliminar ? '' : 'disabled'}>✕</button>
      `;
    }

    div.addEventListener('click', function(e) {
      if (e.target.closest('.btn-eliminar-sesion')) return;
      cargarSesion(f);
      renderCintaSesiones(f.substring(0, 7));
      renderControlAnual(month);
      if (vistaActual === 'proyecto') mostrarProyecto();
      else if (vistaActual === 'inicio') mostrarInicio();
    });
    const btnEliminar = div.querySelector('.btn-eliminar-sesion');
    btnEliminar.addEventListener('click', function(e) {
      e.stopPropagation();
      eliminarSesion(f);
    });
    container.appendChild(div);
  });
}
function actualizarControlAnual() {
  if (!controlMesSelect) return;
  const mes = sesionActivaFecha ? sesionActivaFecha.substring(0, 7) : hoyLocalISO().substring(0, 7);
  let encontrado = false;
  for (let opt of controlMesSelect.options) {
    if (opt.value === mes) { encontrado = true; break; }
  }
  if (!encontrado) {
    const opt = document.createElement('option');
    opt.value = mes;
    const [a, m] = mes.split('-');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    opt.textContent = `${meses[parseInt(m)-1]} ${a}`;
    controlMesSelect.appendChild(opt);
    const opts = Array.from(controlMesSelect.options);
    opts.sort((a,b) => a.value.localeCompare(b.value));
    controlMesSelect.innerHTML = '';
    opts.forEach(o => controlMesSelect.appendChild(o));
  }
  controlMesSelect.value = mes;
  renderControlAnual(mes);
}

// ========== BOTÓN NUEVO CALENDARIO (visibilidad) ==========
function actualizarBotonNuevoCalendario() {
  if (!btnNuevoCalendario || !panelCalendarizacion) return;
  const visible = !panelCalendarizacion.classList.contains('hidden');
  btnNuevoCalendario.style.setProperty('display', visible ? 'flex' : 'none', 'important');
}
window.actualizarBotonNuevoCalendario = actualizarBotonNuevoCalendario;

// ========== TOGGLE NUEVO SIDEBAR ==========
function toggleNuevoSidebar(forceState) {
  if (!sidebarNuevo) return;
  const isOpen = sidebarNuevo.classList.contains('open');
  const newState = (typeof forceState === 'boolean') ? forceState : !isOpen;

  if (newState) {
    panelMenuNuevo.classList.remove('hidden');
    panelCalendarizacion.classList.add('hidden');
    panelEmailNuevo.classList.add('hidden');
    sidebarNuevo.classList.remove('ancho');
    sidebarNuevo.classList.add('open');
    localStorage.setItem(NUEVO_SIDEBAR_KEY, 'true');
    actualizarBotonNuevoCalendario();
  } else {
    sidebarNuevo.classList.remove('open');
    localStorage.setItem(NUEVO_SIDEBAR_KEY, 'false');
  }
  if (newState) {
    panelMenuNuevo.classList.remove('hidden');
    panelCalendarizacion.classList.add('hidden');
    panelEmailNuevo.classList.add('hidden');
    const panelSyncEl = document.getElementById('panelSync');
    if (panelSyncEl) panelSyncEl.classList.add('hidden');
    sidebarNuevo.classList.remove('ancho');
    sidebarNuevo.classList.add('open');
    localStorage.setItem(NUEVO_SIDEBAR_KEY, 'true');
    actualizarBotonNuevoCalendario();
  }
}

// ========== ABRIR PANEL DE CALENDARIZACIÓN ==========
function abrirPanelCalendarizacion() {
  if (!panelMenuNuevo || !panelCalendarizacion || !sidebarNuevo) return;
  panelMenuNuevo.classList.add('hidden');
  panelCalendarizacion.classList.remove('hidden');
  sidebarNuevo.classList.add('ancho');
  window.formularioActivo = false;
  actualizarVistaCalendarizacion();
  renderExcepciones();
  if (!sidebarNuevo.classList.contains('open')) {
    toggleNuevoSidebar(true);
  }
  actualizarBotonNuevoCalendario();
}

// ========== VISTAS ==========
function mostrarInicio() {
  vistaActual = 'inicio';
  document.querySelectorAll('#navPrincipal .nav-item[data-vista]').forEach(el => el.classList.remove('active'));
  document.querySelector('#navPrincipal .nav-item[data-vista="inicio"]').classList.add('active');
  sidebarSecundario.classList.add('hidden');
  sidebarTerciario.classList.add('hidden');
  toggleSidebarDerecho(false);
  btnToggleDerecho.classList.add('hidden');
  actualizarTituloSidebar();
  btnAgregar.style.display = 'none';
  btnAprobarTodos.style.display = 'none';
  secBadgeLabel.textContent = 'Secciones';
  document.getElementById('btnGenerarPDFSidebar').style.display = 'none';
  ocultarCintaSesiones();

  panelPrincipal.innerHTML = `
    <div class="doc-header">
      <div class="doc-type">Inicio</div>
      <div class="doc-title">Panel de control</div>
      <div class="doc-sub">Bienvenido al generador de órdenes del día</div>
    </div>
    <div class="section-title">Resumen</div>
    <div class="dashboard-grid">
      <div class="dashboard-card"><div class="numero">${secciones.length}</div><div class="etiqueta">Puntos totales</div></div>
      <div class="dashboard-card"><div class="numero">${SECCIONES_DEL_DOCUMENTO.length}</div><div class="etiqueta">Secciones</div></div>
      <div class="dashboard-card"><div class="numero">PDF</div><div class="etiqueta">Listo para generar</div></div>
    </div>
    <div style="margin-top:20px; padding:20px; background:#f7f7f7; border-radius:6px; border:1px solid #e8e8e8;">
      <p style="font-size:13px; color:#555;">
        <strong>Vistas disponibles:</strong><br>
        • <strong>Inicio</strong> — Resumen general.<br>
        • <strong>Proyecto del orden del día</strong> — Gestión de puntos por sección y generación de PDF.<br>
        • <strong>Sesión previa</strong> — Revisión y aprobación de todos los puntos registrados.<br>
        • <strong>Acta de sesión</strong> — Revisión final y generación del acta en PDF.
      </p>
    </div>
  `;
  renderResumenClasificacion();
  poblarFiltroDependencias();
  renderCintaSesiones();
  inicializarControlAnual();
}
function mostrarProyecto() {
  asegurarCalendarioDisponible();
  if (!sesionActivaFecha || !sesiones[sesionActivaFecha]) {
    const proxima = obtenerProximaSesion();
    if (proxima) cargarSesion(proxima);
    else {
      const fecha = siguienteFechaSesion(hoyLocalISO());
      sesiones[fecha] = { tipoSesion: 'Ordinaria', numeroSesion: 1, secciones: [] };
      guardarSesiones();
      cargarSesion(fecha);
    }
  }

  vistaActual = 'proyecto';
  document.querySelectorAll('#navPrincipal .nav-item[data-vista]').forEach(el => el.classList.remove('active'));
  document.querySelector('#navPrincipal .nav-item[data-vista="proyecto"]').classList.add('active');
  sidebarSecundario.classList.remove('hidden');
  cerrarCreacion();
  btnToggleDerecho.classList.remove('hidden');
  btnAgregar.style.display = 'flex';
  btnAprobarTodos.style.display = 'none';
  secBadgeLabel.textContent = 'Secciones';
  document.getElementById('btnGenerarPDFSidebar').style.display = 'block';
  actualizarTituloSidebar();
  renderCintaSesiones();
  inicializarControlAnual();

  if (secciones.length === 0) {
    asegurarPuntosFijos();
  }

  if (!SECCIONES_DEL_DOCUMENTO.includes(seccionActual)) {
    seccionActual = 'aprobaciones';
  }
  reordenarAsuntosGenerales();

  const pts = secciones.filter(s => s.seccion === seccionActual);
  puntoSeleccionadoId = pts.length > 0 ? pts[0].id : null;

  renderSecciones();
  renderPanelPrincipal();
  actualizarBadgesYVisibilidad();
  actualizarEstadoBotonesYBloques();
  renderSidebarDerecho();
  renderResumenClasificacion();
  poblarFiltroDependencias();

  const saved = localStorage.getItem(SIDEBAR_DERECHO_KEY);
  if (saved === 'true') toggleSidebarDerecho(true);
  else toggleSidebarDerecho(false);
}
function mostrarSesionPrevia() {
  vistaActual = 'sesionPrevia';
  document.querySelectorAll('#navPrincipal .nav-item[data-vista]').forEach(el => el.classList.remove('active'));
  document.querySelector('#navPrincipal .nav-item[data-vista="sesionPrevia"]').classList.add('active');
  sidebarSecundario.classList.remove('hidden');
  cerrarCreacion();
  toggleSidebarDerecho(false);
  btnToggleDerecho.classList.add('hidden');
  secBadgeLabel.textContent = 'Sesión previa';
  btnAgregar.style.display = 'none';
  btnAprobarTodos.style.display = 'flex';
  document.getElementById('btnGenerarPDFSidebar').style.display = 'none';
  actualizarTituloSidebar();
  ocultarCintaSesiones();

  if (!puntoPreviaSeleccionadoId || !secciones.some(s => s.id === puntoPreviaSeleccionadoId)) {
    puntoPreviaSeleccionadoId = secciones.length > 0 ? secciones[0].id : null;
  }
  renderSesionPrevia();
  renderResumenClasificacion();
  poblarFiltroDependencias();
}
function renderSesionPrevia() {
  const nav = navSecundario;
  nav.innerHTML = '';

  if (secciones.length === 0) {
    secSubtitle.textContent = '0 puntos';
    nav.innerHTML = `<div style="padding:16px; color:#999; font-size:12px;">No hay puntos registrados.</div>`;
    panelPrincipal.innerHTML = `<div class="placeholder-msg" style="margin-top:60px;"><strong>No hay un proyecto creado</strong><br>Genera un proyecto para revisar sus puntos.</div>`;
    return;
  }

  const puntosFiltrados = obtenerPuntosFiltrados();
  const idsFiltrados = new Set(puntosFiltrados.map(p => p.id));

  if (puntoPreviaSeleccionadoId && !idsFiltrados.has(puntoPreviaSeleccionadoId)) {
    puntoPreviaSeleccionadoId = puntosFiltrados.length > 0 ? puntosFiltrados[0].id : null;
  }

  const totalAprobados = puntosFiltrados.filter(s => s.aprobado === true).length;
  secSubtitle.textContent = terminoBusqueda
    ? `${totalAprobados} de ${puntosFiltrados.length} coinciden`
    : `${totalAprobados} de ${secciones.length} aprobados`;

  puntosFiltrados.forEach((sec, idx) => {
    const idxGlobal = secciones.indexOf(sec);
    const titulo = getTituloPunto(sec, idxGlobal);
    const seleccionado = sec.id === puntoPreviaSeleccionadoId;
    const div = document.createElement('div');
    div.className = 'check-item' + (sec.aprobado ? ' aprobado' : '') + (seleccionado ? ' active' : '');
    div.innerHTML = `
      <input type="checkbox" id="chkPrevia_${sec.id}" ${sec.aprobado ? 'checked' : ''} />
      <label for="chkPrevia_${sec.id}">${titulo}</label>
    `;
    div.addEventListener('click', function() {
      if (puntoPreviaSeleccionadoId === sec.id) return;
      puntoPreviaSeleccionadoId = sec.id;
      renderSesionPrevia();
    });
    div.querySelector('input').addEventListener('change', function(e) {
      e.stopPropagation();
      sec.aprobado = this.checked;
      guardarEstadoActual();
      div.classList.toggle('aprobado', sec.aprobado);
      const aprobados = puntosFiltrados.filter(s => s.aprobado === true).length;
      secSubtitle.textContent = terminoBusqueda
        ? `${aprobados} de ${puntosFiltrados.length} coinciden`
        : `${aprobados} de ${secciones.length} aprobados`;
    });
    nav.appendChild(div);
  });

  if (puntosFiltrados.length === 0) {
    panelPrincipal.innerHTML = `<div class="placeholder-msg" style="margin-top:60px;"><strong>No hay coincidencias</strong></div>`;
    return;
  }

  renderDetallePrevia(puntoPreviaSeleccionadoId);
}
function renderDetallePrevia(id) {
  const sec = secciones.find(s => s.id === id);
  if (!sec) {
    panelPrincipal.innerHTML = `<div class="placeholder-msg" style="margin-top:60px;"><strong>Selecciona un punto</strong></div>`;
    return;
  }
  const idxGlobal = secciones.indexOf(sec);
  const titulo = getTituloPunto(sec, idxGlobal);
  const aprobado = sec.aprobado === true;
  const dependencia = sec.dependencia || 'Pleno';
  const votoActual = sec.voto || 'Pendiente';
  const anotacionesActual = sec.anotaciones || '';
  const puntosFiltrados = obtenerPuntosFiltrados();
  const idxFiltrado = puntosFiltrados.findIndex(s => s.id === id);
  const puedeAnterior = idxFiltrado > 0;
  const puedeSiguiente = idxFiltrado < puntosFiltrados.length - 1;
  const esFijo = sec.fijo === true;

  panelPrincipal.innerHTML = `
    <div class="doc-header">
      <div class="doc-title">${titulo}</div>
    </div>
    <div class="previa-card ${aprobado ? 'aprobado' : ''}">
      <div class="previa-tags">
        <span class="previa-tag">${dependencia}</span>
        <span class="previa-tag">${sec.seccion}</span>
      </div>
      <div class="previa-cuerpo">${sec.contenido || 'Sin contenido'}</div>
      <div class="previa-campos">
        <div class="ter-field">
          <label class="ter-label">Tipo de votación</label>
          <select id="previaVotoSelect" class="ter-select">
            <option value="Pendiente" ${votoActual === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="Aprobado" ${votoActual === 'Aprobado' ? 'selected' : ''}>Aprobado</option>
            <option value="Rechazado" ${votoActual === 'Rechazado' ? 'selected' : ''}>Rechazado</option>
            <option value="Abstención" ${votoActual === 'Abstención' ? 'selected' : ''}>Abstención</option>
          </select>
        </div>
        <div class="ter-field">
          <label class="ter-label">Anotaciones (opcional)</label>
          <textarea id="previaAnotaciones" class="ter-textarea" placeholder="Observaciones...">${anotacionesActual}</textarea>
        </div>
      </div>
      <div class="previa-footer">
        <button class="btn-eliminar" id="btnEliminarPrevia" ${esFijo ? 'disabled' : ''}>
          ${esFijo ? 'Fijo' : 'Eliminar'}
        </button>
        <button class="btn-mover" id="btnPreviaAnterior" ${!puedeAnterior ? 'disabled' : ''}>◀</button>
        <button class="btn-mover" id="btnPreviaSiguiente" ${!puedeSiguiente ? 'disabled' : ''}>▶</button>
      </div>
    </div>
  `;

  document.getElementById('btnEliminarPrevia')?.addEventListener('click', function() {
    if (esFijo) return;
    // === NUEVO: verificar permiso ===
    if (!window.tieneRol('PuntosWrite') && !window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
      alert('No tienes permiso para eliminar puntos.');
      return;
    }
    if (confirm(`¿Eliminar "${titulo}"?`)) {
      const index = secciones.findIndex(s => s.id === sec.id);
      if (index !== -1 && !secciones[index].fijo) {
        secciones.splice(index, 1);
        guardarEstadoActual();
        const nuevosFiltrados = obtenerPuntosFiltrados();
        if (nuevosFiltrados.length > 0) {
          const nuevoIdx = Math.min(idxFiltrado, nuevosFiltrados.length - 1);
          puntoPreviaSeleccionadoId = nuevosFiltrados[nuevoIdx].id;
        } else {
          puntoPreviaSeleccionadoId = null;
        }
        renderSesionPrevia();
        renderResumenClasificacion();
        poblarFiltroDependencias();
        actualizarBadgesYVisibilidad();
      }
    }
  });

  document.getElementById('previaVotoSelect')?.addEventListener('change', function() {
    sec.voto = this.value;
    guardarEstadoActual();
  });
  document.getElementById('previaAnotaciones')?.addEventListener('input', function() {
    sec.anotaciones = this.value;
    guardarEstadoActual();
  });

  document.getElementById('btnPreviaAnterior')?.addEventListener('click', function() {
    if (idxFiltrado > 0) {
      puntoPreviaSeleccionadoId = puntosFiltrados[idxFiltrado - 1].id;
      renderSesionPrevia();
    }
  });
  document.getElementById('btnPreviaSiguiente')?.addEventListener('click', function() {
    if (idxFiltrado < puntosFiltrados.length - 1) {
      puntoPreviaSeleccionadoId = puntosFiltrados[idxFiltrado + 1].id;
      renderSesionPrevia();
    }
  });
}

// ========== VISTA: ACTA DE SESIÓN ==========
function mostrarActaSesion() {
  if (secciones.length === 0) {
    alert('Primero genera un proyecto.');
    return;
  }
  vistaActual = 'actaSesion';
  document.querySelectorAll('#navPrincipal .nav-item[data-vista]').forEach(el => el.classList.remove('active'));
  document.querySelector('#navPrincipal .nav-item[data-vista="actaSesion"]').classList.add('active');
  sidebarSecundario.classList.add('hidden');
  sidebarTerciario.classList.add('hidden');
  toggleSidebarDerecho(false);
  btnToggleDerecho.classList.add('hidden');
  btnAgregar.style.display = 'none';
  btnAprobarTodos.style.display = 'none';
  document.getElementById('btnGenerarPDFSidebar').style.display = 'block';
  actualizarTituloSidebar();
  ocultarCintaSesiones();
  renderActaSesion();
}
function renderActaSesion() {
  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  const numero = proyectoMeta.numeroSesion || 1;
  const fecha = proyectoMeta.fecha ? formatearFechaES(proyectoMeta.fecha) : 'Fecha no definida';
  const puntosFiltrados = obtenerPuntosFiltrados();
  const pendientes = puntosFiltrados.filter(s => !s.fijo && s.aprobado !== true).length;

  let html = `
    <div class="doc-header">
      <div class="doc-type">Acta de sesión</div>
      <div class="doc-title">Sesión ${tipo} N° ${numero}</div>
      <div class="doc-sub">${fecha}</div>
    </div>
  `;

  if (pendientes > 0) {
    html += `
      <div style="margin:12px 0; padding:10px 14px; background:#fff4e5; border:1px solid #f0c274; border-radius:6px; font-size:12px; color:#8a5a00;">
        ${pendientes} punto(s) sin votación registrada.
      </div>`;
  }

  if (puntosFiltrados.length === 0) {
    html += `<div class="placeholder-msg" style="margin-top:40px;"><strong>No hay coincidencias</strong></div>`;
    panelPrincipal.innerHTML = html;
    return;
  }

  html += `<div class="lista-puntos-expandida">`;
  puntosFiltrados.forEach(sec => {
    const idx = secciones.indexOf(sec);
    const titulo = getTituloPunto(sec, idx);
    const dependencia = sec.dependencia || 'Pleno';
    const voto = sec.voto || 'Pendiente';
    const colorVoto = voto === 'Pendiente' ? '#b36b00' : (voto === 'Rechazado' ? '#a11' : '#1a7a1a');
    html += `
      <div class="punto-card">
        <div class="punto-card-header">
          <span class="punto-card-titulo">${titulo}</span>
          <span class="punto-card-badge">${dependencia}</span>
        </div>
        <div class="punto-card-cuerpo">${sec.contenido || 'Sin contenido'}</div>
        <div class="punto-card-acciones">
          <span style="font-size:11px; color:#999;">${sec.seccion}</span>
          <span style="font-size:11px; font-weight:600; color:${colorVoto};">${voto}</span>
        </div>
      </div>
    `;
  });
  html += `</div>`;

  panelPrincipal.innerHTML = html;
}

// ========== CONTROL DE BOTÓN + ==========
function actualizarEstadoBotonesYBloques() {
  if (vistaActual === 'orden') {
    btnAgregar.style.display = 'none';
    return;
  }
  btnAgregar.style.display = 'flex';
  if (seccionActual === 'asuntos generales' || secciones.length === 0) {
    btnAgregar.disabled = true;
    return;
  }
}

// ========== SIDEBAR DERECHO ==========
function renderSidebarDerecho() {
  if (vistaActual === 'orden') return;
  if (!navEsquema) return;
  navEsquema.innerHTML = '';
  const dependenciaFiltro = filtroDependenciaEsquema.value;
  let puntosBase = obtenerPuntosFiltrados();

  if (dependenciaFiltro !== '') {
    puntosBase = puntosBase.filter(sec => sec.dependencia === dependenciaFiltro);
  }

  if (puntosBase.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '20px';
    empty.style.color = '#999';
    empty.style.fontSize = '13px';
    empty.textContent = dependenciaFiltro ? 'No hay puntos con esa dependencia.' : 'No hay puntos para mostrar.';
    navEsquema.appendChild(empty);
    return;
  }

  puntosBase.forEach(sec => {
    const idxGlobal = secciones.indexOf(sec);
    const div = document.createElement('div');
    div.className = 'nav-item';
    if (sec.id === puntoSeleccionadoId) div.classList.add('active');
    div.dataset.puntoId = sec.id;
    const titulo = getTituloPunto(sec, idxGlobal);
    div.innerHTML = `<span class="nav-dot"></span> ${titulo}`;
    const badge = document.createElement('span');
    badge.className = 'badge-bloque';
    if (sec.anexo === true) badge.classList.add('anexo-true');
    badge.textContent = sec.seccion || 'Sin sección';
    div.appendChild(badge);

    div.addEventListener('click', () => {
      seleccionarPuntoDesdeDerecho(sec.id);
    });
    navEsquema.appendChild(div);
  });
}
function seleccionarPuntoDesdeDerecho(id) {
  const sec = secciones.find(s => s.id === id);
  if (!sec) return;
  seccionActual = sec.seccion;
  puntoSeleccionadoId = id;
  if (vistaActual !== 'proyecto') {
    mostrarProyecto();
  } else {
    document.querySelectorAll('#navSecundario .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.seccion === seccionActual);
    });
    renderPanelPrincipal();
    actualizarBadgesYVisibilidad();
    actualizarEstadoBotonesYBloques();
    renderSidebarDerecho();
  }
}

// ========== TOGGLE SIDEBAR DERECHO ==========
function toggleSidebarDerecho(open) {
  if (typeof open === 'boolean') {
    if (open) {
      sidebarDerecho.classList.add('open');
      document.querySelector('.main').classList.add('shifted');
      localStorage.setItem(SIDEBAR_DERECHO_KEY, 'true');
    } else {
      sidebarDerecho.classList.remove('open');
      document.querySelector('.main').classList.remove('shifted');
      localStorage.setItem(SIDEBAR_DERECHO_KEY, 'false');
    }
  } else {
    const isOpen = sidebarDerecho.classList.contains('open');
    toggleSidebarDerecho(!isOpen);
  }
}

// ========== BADGES Y TÍTULO ==========
function actualizarBadgesYVisibilidad() {
  const total = obtenerPuntosFiltrados().length;
  totalBadge.textContent = total;
  document.querySelectorAll('#navSecundario .nav-item').forEach(item => {
    const seccion = item.dataset.seccion;
    const badge = item.querySelector('.sec-badge');
    if (badge) {
      const puntosEnSeccion = secciones.filter(s => s.seccion === seccion);
      const puntosFiltradosEnSeccion = puntosEnSeccion.filter(p => {
        if (!terminoBusqueda) return true;
        return puntoCoincide(p, terminoBusqueda);
      });
      badge.textContent = puntosFiltradosEnSeccion.length;
    }
  });
}
function actualizarTituloSidebar() {
  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  const numero = proyectoMeta.numeroSesion || 1;
  docTitleSidebar.textContent = `Sesión ${tipo} N° ${numero}`;
  if (proyectoMeta.fecha) {
    const fechaObj = parsearFechaLocal(proyectoMeta.fecha);
    const opciones = { day: 'numeric', month: 'long', year: 'numeric' };
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opciones);
    docSubSidebar.textContent = fechaFormateada;
  } else {
    docSubSidebar.textContent = 'Fecha no definida';
  }
}

// ========== GENERACIÓN DE PDF ==========
function generarPDFConPrint() {
  if (secciones.length === 0) {
    alert('No hay puntos para generar el PDF.');
    return;
  }
  const old = document.querySelector('.print-content');
  if (old) old.remove();

  const printContainer = document.createElement('div');
  printContainer.className = 'print-content';

  let fechaMostrada = '';
  if (proyectoMeta.fecha) {
    const fechaObj = parsearFechaLocal(proyectoMeta.fecha);
    fechaMostrada = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  } else {
    fechaMostrada = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const tipoSesion = proyectoMeta.tipoSesion || '';
  const numeroSesion = proyectoMeta.numeroSesion || '';
  let tituloPrincipal = 'Proyecto del orden del día';
  if (tipoSesion && numeroSesion) {
    tituloPrincipal = `Sesión ${tipoSesion} N° ${numeroSesion}`;
  }

  let subtitulo = fechaMostrada;
  if (!proyectoMeta.tipoSesion || !proyectoMeta.numeroSesion) {
    subtitulo += ' · ÓRGANO DE ADMINISTRACIÓN JUDICIAL';
  }

  let html = `
    <div class="doc-header">
      <img class="logo-print"
           src="https://raw.githubusercontent.com/cdelgadoffs/CGD/d91c7a41d1778d4641ffbd603cbba2c9adce53e5/logovert.png"
           alt="Logo" />
      <div class="doc-header-texto">
        <div class="doc-type">PROYECTO DE ORDEN DEL DÍA</div>
        <div class="doc-title">${tituloPrincipal}</div>
        <div class="doc-sub">${subtitulo}</div>
      </div>
    </div>
  `;

  secciones.forEach(sec => {
    const idxGlobal = secciones.indexOf(sec);
    const titulo = getTituloPunto(sec, idxGlobal);
    const dependencia = sec.dependencia || 'Pleno';
    const metaPartes = [dependencia, sec.seccion].filter(Boolean);
    if (sec.voto && sec.voto !== 'Pendiente') metaPartes.push(sec.voto);
    html += `
      <div class="punto-print">
        <div class="numero">${titulo}</div>
        <div class="meta">${metaPartes.join(' · ')}</div>
        <div class="contenido">${sec.contenido || 'Sin contenido'}</div>
      </div>
    `;
  });

  html += `<div class="footer-print"> ${new Date().toLocaleDateString()}</div>`;
  printContainer.innerHTML = html;
  document.body.appendChild(printContainer);

  printContainer.offsetHeight;

  const logoImg = printContainer.querySelector('.logo-print');
  let impresionLanzada = false;
  let timeoutSalvaguarda = null;

  const lanzarImpresion = () => {
    if (impresionLanzada) return;
    impresionLanzada = true;
    if (timeoutSalvaguarda) clearTimeout(timeoutSalvaguarda);
    window.print();
    setTimeout(() => printContainer.remove(), 1000);
  };

  if (logoImg && !logoImg.complete) {
    logoImg.addEventListener('load', lanzarImpresion, { once: true });
    logoImg.addEventListener('error', lanzarImpresion, { once: true });
    timeoutSalvaguarda = setTimeout(lanzarImpresion, 2500);
  } else {
    lanzarImpresion();
  }
}

// ========== MODALES ==========
function abrirModalActa() {
  if (proyectoMeta.fecha) {
    const fechaAnterior = calcularFechaAnterior(proyectoMeta.fecha, 7);
    if (fechaAnterior) actaFecha.value = fechaAnterior;
    else actaFecha.value = '';
  } else {
    actaFecha.value = '';
  }
  actaTipoSesion.value = proyectoMeta.tipoSesion || 'Ordinaria';
  modalActa.classList.add('active');
}
function cerrarModalActa() { modalActa.classList.remove('active'); }
function agregarActa() {
  const tipo = actaTipoSesion.value;
  const fecha = actaFecha.value;
  if (!fecha) { alert('Selecciona una fecha.'); return; }
  const fechaFormateada = formatearFechaES(fecha);
  const contenido = `Aprobación, en su caso, del acta de la sesión ${tipo.toLowerCase()} del ${fechaFormateada}.`;
  const nuevoId = 'sec_' + Date.now();
  const nuevaSec = {
    id: nuevoId,
    clasificacion: 'Pleno',
    contenido: contenido,
    seccion: 'aprobaciones',
    subbloque: 'Pleno',
    fijo: false,
    anexo: false,
    voto: 'Pendiente',
    anotaciones: '',
    aprobado: false,
    archivos: []
  };
  const insertIdx = getInsertIndex('aprobaciones');
  secciones.splice(insertIdx, 0, nuevaSec);
  guardarEstadoActual();
  cerrarModalActa();
  puntoSeleccionadoId = nuevoId;
  if (vistaActual !== 'proyecto') {
    mostrarProyecto();
  } else {
    renderSecciones();
    renderPanelPrincipal();
    actualizarBadgesYVisibilidad();
    actualizarEstadoBotonesYBloques();
    renderSidebarDerecho();
    renderResumenClasificacion();
    poblarFiltroDependencias();
  }
}

// ========== MODAL NUEVO PROYECTO ==========
function abrirModalNuevoProyecto() {
  // === NUEVO: verificar permiso ===
  if (!window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
    alert('No tienes permiso para crear sesiones extraordinarias.');
    return;
  }
  const hoy = hoyLocalISO();
  nuevoFecha.value = hoy;
  modalNuevo.classList.add('active');
  confirmCheckbox.checked = false;
  modalNuevoConfirm.disabled = true;
}
function cerrarModalNuevoProyecto() { modalNuevo.classList.remove('active'); }
async function confirmarNuevoProyecto() {
  if (!confirmCheckbox.checked) return;
  const fecha = nuevoFecha.value;
  if (!fecha) { alert('Selecciona una fecha.'); return; }

  if (sesiones[fecha]) {
    if (!confirm(`Ya existe una sesión en ${formatearFechaES(fecha)}. ¿Sobrescribir?`)) {
      return;
    }
  }

  modalNuevoConfirm.disabled = true;
  modalNuevoConfirm.textContent = 'Creando...';

  sesiones[fecha] = {
    tipoSesion: 'Extraordinaria',
    numeroSesion: 1,
    secciones: []
  };
  guardarSesiones();
  recalcularNumerosSesion();

  cargarSesion(fecha);
  asegurarPuntosFijos();

  // Añadir punto para el acta de esta extraordinaria
  const contenidoActa = `Aprobación, en su caso, del acta de la sesión extraordinaria del ${formatearFechaES(fecha)}.`;
  const yaExiste = secciones.some(s => s.contenido === contenidoActa && s.seccion === 'aprobaciones');
  
  if (!yaExiste) {
    const nuevoId = 'sec_' + Date.now();
    const nuevoPunto = {
      id: nuevoId,
      clasificacion: 'Pleno',
      contenido: contenidoActa,
      seccion: 'aprobaciones',
      subbloque: 'Pleno',
      fijo: false,
      anexo: false,
      voto: 'Pendiente',
      anotaciones: '',
      aprobado: false,
      dependencia: 'Pleno',
      asunto: 'Acta extraordinaria',
      archivos: []
    };
    const insertIdx = getInsertIndex('aprobaciones');
    secciones.splice(insertIdx, 0, nuevoPunto);
    guardarEstadoActual();
  }

  cerrarModalNuevoProyecto();
  modalNuevoConfirm.disabled = false;
  modalNuevoConfirm.textContent = 'Crear';

  if (vistaActual !== 'proyecto') {
    mostrarProyecto();
  } else {
    renderSecciones();
    renderPanelPrincipal();
    actualizarBadgesYVisibilidad();
    actualizarEstadoBotonesYBloques();
    renderSidebarDerecho();
    renderResumenClasificacion();
    poblarFiltroDependencias();
    renderCintaSesiones();
  }
}

// ========== MODAL ADJUNTAR (NUEVO) ==========
// Referencias al modal adjuntar
const modalAdjuntar = document.getElementById('modalAdjuntar');
const adjuntarArchivoInput = document.getElementById('adjuntarArchivoInput');
const btnAdjuntarCancel = document.getElementById('btnAdjuntarCancel');
const btnAdjuntarConfirm = document.getElementById('btnAdjuntarConfirm');
let puntoAdjuntarId = null;

function abrirModalAdjuntar(id) {
  // === NUEVO: verificar permiso ===
  if (!window.tieneRol('PuntosWrite') && !window.tieneRol('Admin') && !window.tieneRol('Administrador')) {
    alert('No tienes permiso para adjuntar archivos.');
    return;
  }
  puntoAdjuntarId = id;
  adjuntarArchivoInput.value = '';
  modalAdjuntar.classList.add('active');
}

function cerrarModalAdjuntar() {
  modalAdjuntar.classList.remove('active');
  puntoAdjuntarId = null;
}

function adjuntarArchivoPunto() {
  const file = adjuntarArchivoInput.files[0];
  if (!file) {
    alert('Selecciona un archivo.');
    return;
  }
  if (file.size > 1024 * 1024) {
    alert('El archivo excede 1MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const archivo = {
      nombre: file.name,
      tipo: file.type,
      data: e.target.result
    };
    const punto = secciones.find(s => s.id === puntoAdjuntarId);
    if (punto) {
      if (!punto.archivos) punto.archivos = [];
      punto.archivos.push(archivo);
      punto.anexo = true;
      guardarEstadoActual();
      if (vistaActual === 'proyecto') {
        renderPanelPrincipal();
        renderSidebarDerecho();
        renderResumenClasificacion();
      } else if (vistaActual === 'sesionPrevia') {
        renderSesionPrevia();
      } else if (vistaActual === 'actaSesion') {
        renderActaSesion();
      }
      cerrarModalAdjuntar();
    }
  };
  reader.readAsDataURL(file);
}

// ========== INICIALIZACIÓN CON PERMISOS ==========

// === NUEVO: Mapa de permisos para elementos ===
const PERMISOS_ELEMENTOS = {
  'menuItemCalendarizacion': 'Calendarization',
  'menuItemEmail': 'Email',
  'menuItemSync': 'Admin',
  'btnNuevoProyecto': 'Admin',
  'btnAgregarSeccion': 'PuntosWrite',
  'btnConfirmarCreacion': 'PuntosWrite',
  'btnAdjuntarArchivo': 'PuntosWrite',
  'navProyecto': 'PuntosWrite',
  'btnGenerarPDFSidebar': null, // todos pueden generar PDF
};

// === NUEVO: Función para aplicar permisos ===
function aplicarPermisos() {
  const tieneRol = (rol) => window.tieneRol(rol);
  const esAdmin = tieneRol('Admin') || tieneRol('Administrador');

  // 1. Ocultar elementos según permisos
  Object.keys(PERMISOS_ELEMENTOS).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const rolNecesario = PERMISOS_ELEMENTOS[id];
    if (rolNecesario && !tieneRol(rolNecesario) && !esAdmin) {
      el.style.display = 'none';
    } else {
      el.style.display = ''; // restaurar si tiene permiso
    }
  });

  // 2. Si es solo lector (ReadOnly sin otros roles de edición)
  const esLector = tieneRol('ReadOnly') && !esAdmin && !tieneRol('PuntosWrite');
  if (esLector) {
    document.querySelectorAll('.btn-add, .btn-eliminar, .btn-mover, .btn-adjuntar, #btnAgregarSeccion, #btnAprobarTodos, #btnNuevoProyecto').forEach(el => {
      el.style.display = 'none';
    });
    document.body.classList.add('modo-lectura');
  } else {
    document.body.classList.remove('modo-lectura');
  }

  // 3. Controlar visibilidad del botón "+" de calendario (está dentro del sidebar negro)
  const btnNuevoCalendario = document.getElementById('btnNuevoCalendario');
  if (btnNuevoCalendario) {
    btnNuevoCalendario.style.display = (tieneRol('Calendarization') || esAdmin) ? 'flex' : 'none';
  }
}

// ========== INICIALIZACIÓN ==========
function init() {
  if (fechaActualEl) {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    fechaActualEl.textContent = ahora.toLocaleDateString('es-ES', opciones);
  }

  cargarDiaSesion();
  if (diaSesionSelect) diaSesionSelect.value = diaSesion;

  excepciones = cargarExcepciones();
  sesiones = cargarSesiones();

  asegurarCalendarioDisponible();
  recalcularNumerosSesion();

  let fechaActiva = obtenerProximaSesion();
  if (!fechaActiva) {
    const todas = Object.keys(sesiones).sort();
    if (todas.length > 0) fechaActiva = todas[0];
  }
  if (fechaActiva) {
    cargarSesion(fechaActiva);
  } else {
    const fecha = siguienteFechaSesion(hoyLocalISO());
    sesiones[fecha] = { tipoSesion: 'Ordinaria', numeroSesion: 1, secciones: [] };
    guardarSesiones();
    cargarSesion(fecha);
  }

  const nuevoState = localStorage.getItem(NUEVO_SIDEBAR_KEY);
  if (nuevoState === 'true' && sidebarNuevo) {
    sidebarNuevo.classList.add('open');
  } else if (sidebarNuevo) {
    sidebarNuevo.classList.remove('open');
  }

  if (clearSearchBtn) clearSearchBtn.style.display = 'none';
  mostrarInicio();
  actualizarBotonNuevoCalendario();

  // ===== EVENTOS =====

  // === NUEVO: Eventos de navegación con control de permisos ===
  document.querySelectorAll('#navPrincipal .nav-item[data-vista]').forEach(el => {
    el.addEventListener('click', function() {
      const vista = this.dataset.vista;
      const tieneRol = (rol) => window.tieneRol(rol);
      const esAdmin = tieneRol('Admin') || tieneRol('Administrador');
      const esLector = tieneRol('ReadOnly') && !esAdmin && !tieneRol('PuntosWrite');

      if (vista === 'proyecto' && !tieneRol('PuntosWrite') && !esAdmin) {
        alert('No tienes permiso para editar el proyecto.');
        return;
      }
      if (esLector && (vista === 'inicio' || vista === 'proyecto')) {
        alert('Tu rol solo permite visualizar la Previa de sesión y el Acta.');
        mostrarSesionPrevia();
        return;
      }
      // Ejecutar la vista correspondiente
      if (vista === 'inicio') mostrarInicio();
      else if (vista === 'proyecto') mostrarProyecto();
      else if (vista === 'sesionPrevia') mostrarSesionPrevia();
      else if (vista === 'actaSesion') mostrarActaSesion();
    });
  });

  if (btnAgregar) btnAgregar.addEventListener('click', abrirCreacion);
  if (btnAprobarTodos) {
    btnAprobarTodos.addEventListener('click', function() {
      if (secciones.length === 0) return;
      const puntos = obtenerPuntosFiltrados();
      const todosAprobados = puntos.every(sec => sec.aprobado === true);
      puntos.forEach(sec => { sec.aprobado = !todosAprobados; });
      guardarEstadoActual();
      renderSesionPrevia();
    });
  }
  if (btnCancelarCreacion) btnCancelarCreacion.addEventListener('click', cerrarCreacion);
  if (btnConfirmarCreacion) btnConfirmarCreacion.addEventListener('click', agregarPunto);
  if (btnAdjuntarArchivo) btnAdjuntarArchivo.addEventListener('click', adjuntarArchivos);
  if (btnCerrarPreview) btnCerrarPreview.addEventListener('click', cerrarModalPrevisualizacion);
  if (btnCerrarPreview2) btnCerrarPreview2.addEventListener('click', cerrarModalPrevisualizacion);
  if (modalPreview) {
    modalPreview.addEventListener('click', function(e) {
      if (e.target === this) cerrarModalPrevisualizacion();
    });
  }
  if (actaCancel) actaCancel.addEventListener('click', cerrarModalActa);
  if (modalActa) {
    modalActa.addEventListener('click', function(e) {
      if (e.target === this) cerrarModalActa();
    });
  }
  if (actaConfirm) actaConfirm.addEventListener('click', agregarActa);
  if (btnNuevoProyecto) btnNuevoProyecto.addEventListener('click', abrirModalNuevoProyecto);
  document.getElementById('btnGenerarPDFSidebar')?.addEventListener('click', generarPDFConPrint);
  if (modalNuevoCancel) modalNuevoCancel.addEventListener('click', cerrarModalNuevoProyecto);
  if (modalNuevo) {
    modalNuevo.addEventListener('click', function(e) {
      if (e.target === this) cerrarModalNuevoProyecto();
    });
  }
  if (confirmCheckbox) {
    confirmCheckbox.addEventListener('change', function() {
      modalNuevoConfirm.disabled = !this.checked;
    });
  }
  if (modalNuevoConfirm) modalNuevoConfirm.addEventListener('click', confirmarNuevoProyecto);
  if (btnToggleDerecho) btnToggleDerecho.addEventListener('click', () => toggleSidebarDerecho());
  if (btnCerrarDerecho) btnCerrarDerecho.addEventListener('click', () => toggleSidebarDerecho(false));
  if (filtroDependenciaEsquema) filtroDependenciaEsquema.addEventListener('change', renderSidebarDerecho);
  if (filtroDependencia) {
    filtroDependencia.addEventListener('change', function() {
      renderizarListaDependencias(this.value);
    });
  }

  if (btnToggleNuevoSidebar) btnToggleNuevoSidebar.addEventListener('click', toggleNuevoSidebar);

  if (btnNuevoCalendario) {
    btnNuevoCalendario.addEventListener('click', function() {
      if (panelCalendarizacion.classList.contains('hidden')) {
        abrirPanelCalendarizacion();
      } else {
        toggleFormularioCalendario();
      }
    });
  }

  if (cintaAnterior) cintaAnterior.addEventListener('click', cintaAnteriorMes);
  if (cintaSiguiente) cintaSiguiente.addEventListener('click', cintaSiguienteMes);

  if (controlMesSelect) {
    controlMesSelect.addEventListener('change', function() {
      renderControlAnual(this.value);
      renderCintaSesiones(this.value);
    });
  }

  if (menuItemCalendarizacion) {
    menuItemCalendarizacion.addEventListener('click', abrirPanelCalendarizacion);
  }
  if (btnVolverMenuCalendario) {
    btnVolverMenuCalendario.addEventListener('click', function() {
      panelCalendarizacion.classList.add('hidden');
      panelMenuNuevo.classList.remove('hidden');
      sidebarNuevo.classList.remove('ancho');
      actualizarBotonNuevoCalendario();
    });
  }

  if (vacacionInicio) {
    vacacionInicio.addEventListener('change', function() {
      const inicio = this.value;
      if (inicio) {
        vacacionFin.min = inicio;
        if (vacacionFin.value && vacacionFin.value < inicio) {
          vacacionFin.value = '';
        }
      } else {
        vacacionFin.min = '';
      }
    });
  }

  if (btnGenerarCalendario) {
    btnGenerarCalendario.addEventListener('click', function() {
      if (!confirmSobrescribir || !confirmSobrescribir.checked) {
        alert('Debes marcar la casilla "Sobrescribir calendario existente" para regenerar el calendario.');
        return;
      }

      const dia = parseInt(diaSesionSelect.value, 10);
      if (dia >= 1 && dia <= 5) {
        sesiones = {};
        diaSesion = dia;
        guardarDiaSesion();
        generarCalendarioAnual(new Date().getFullYear());
        aplicarExcepciones();
        limpiarSesionesInvalidas();
        calendarioStatus.textContent = 'Calendario generado correctamente.';
        calendarioStatus.className = 'email-status ok';
        const proxima = obtenerProximaSesion();
        if (proxima) cargarSesion(proxima);
        if (vistaActual === 'proyecto') mostrarProyecto();
        window.formularioActivo = false;
        actualizarVistaCalendarizacion();
        renderCintaSesiones();
        renderExcepciones();
      } else {
        calendarioStatus.textContent = 'Selecciona un día válido.';
        calendarioStatus.className = 'email-status error';
      }
    });
  }

  if (btnAgregarVacacion) {
    btnAgregarVacacion.addEventListener('click', function() {
      const inicio = vacacionInicio.value, fin = vacacionFin.value;
      if (!inicio || !fin) { alert('Selecciona ambas fechas.'); return; }
      if (inicio > fin) { alert('La fecha de inicio debe ser anterior a la de fin.'); return; }
      excepciones.vacaciones.push({ inicio, fin });
      guardarExcepciones();
      generarCalendarioAnual(new Date().getFullYear());
      aplicarExcepciones();
      limpiarSesionesInvalidas();
      vacacionInicio.value = ''; vacacionFin.value = '';
      vacacionFin.min = '';
      renderExcepciones();
      if (vistaActual === 'proyecto') renderCintaSesiones();
      actualizarVistaCalendarizacion();
    });
  }

  if (asuetoFecha) {
    asuetoFecha.addEventListener('change', function() {
      const fecha = this.value;
      if (!fecha) { asuetoOpciones.style.display = 'none'; return; }
      const d = parsearFechaLocal(fecha);
      if (d.getDay() !== diaSesion) {
        asuetoOpciones.style.display = 'none';
        alert('Esa fecha no coincide con un día de sesión ordinaria; no requiere reprogramación.');
        return;
      }
      const anterior = sumarDias(fecha, -1);
      const siguiente = sumarDias(fecha, 1);
      asuetoDestino.innerHTML =
        `<option value="${anterior}">${formatearFechaES(anterior)} (día anterior)</option>` +
        `<option value="${siguiente}">${formatearFechaES(siguiente)} (día siguiente)</option>`;
      asuetoOpciones.style.display = 'block';
    });
  }
  if (btnAgregarAsueto) {
    btnAgregarAsueto.addEventListener('click', function() {
      const fecha = asuetoFecha.value;
      const destino = asuetoDestino.value;
      if (!fecha || !destino) return;
      excepciones.asuetos.push({ fecha, destino });
      guardarExcepciones();
      generarCalendarioAnual(new Date().getFullYear());
      aplicarExcepciones();
      limpiarSesionesInvalidas();
      asuetoFecha.value = '';
      asuetoOpciones.style.display = 'none';
      renderExcepciones();
      if (vistaActual === 'proyecto') renderCintaSesiones();
      actualizarVistaCalendarizacion();
    });
  }

  if (buscadorGlobal) {
    buscadorGlobal.addEventListener('input', aplicarFiltro);
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', function() {
      buscadorGlobal.value = '';
      aplicarFiltro();
    });
  }

  // Eventos del modal adjuntar
  if (btnAdjuntarCancel) btnAdjuntarCancel.addEventListener('click', cerrarModalAdjuntar);
  if (modalAdjuntar) {
    modalAdjuntar.addEventListener('click', function(e) {
      if (e.target === this) cerrarModalAdjuntar();
    });
  }
  if (btnAdjuntarConfirm) btnAdjuntarConfirm.addEventListener('click', adjuntarArchivoPunto);

  renderResumenClasificacion();
  poblarFiltroDependencias();

  // === NUEVO: Aplicar permisos al iniciar ===
  aplicarPermisos();
}

// ========== FUNCIONES DE EXCEPCIONES RENDER ==========
function renderExcepciones() {
  if (excepciones.vacaciones.length === 0) {
    listaVacaciones.innerHTML = '<span class="email-vacio">Ningún periodo agregado</span>';
  } else {
    listaVacaciones.innerHTML = excepciones.vacaciones.map((v, idx) => `
      <span class="email-invitado-chip">${formatearFechaES(v.inicio)} — ${formatearFechaES(v.fin)}
        <span class="eliminar-invitado" data-tipo="vac" data-idx="${idx}">✕</span></span>
    `).join(' ');
  }
  if (excepciones.asuetos.length === 0) {
    listaAsuetos.innerHTML = '<span class="email-vacio">Ningún asueto agregado</span>';
  } else {
    listaAsuetos.innerHTML = excepciones.asuetos.map((a, idx) => `
      <span class="email-invitado-chip">${formatearFechaES(a.fecha)} → ${formatearFechaES(a.destino)}
        <span class="eliminar-invitado" data-tipo="asu" data-idx="${idx}">✕</span></span>
    `).join(' ');
  }
  document.querySelectorAll('#listaVacaciones .eliminar-invitado, #listaAsuetos .eliminar-invitado').forEach(el => {
    el.addEventListener('click', function() {
      const idx = parseInt(this.dataset.idx);
      if (this.dataset.tipo === 'vac') excepciones.vacaciones.splice(idx, 1);
      else excepciones.asuetos.splice(idx, 1);
      guardarExcepciones();
      generarCalendarioAnual(new Date().getFullYear());
      aplicarExcepciones();
      limpiarSesionesInvalidas();
      renderExcepciones();
      if (vistaActual === 'proyecto') renderCintaSesiones();
      actualizarVistaCalendarizacion();
    });
  });
}
function ocultarCintaSesiones() {
  const wrap = document.getElementById('cintaSesionesWrap');
  if (wrap) wrap.classList.add('hidden');
}

let appYaIniciada = false;
function iniciarApp() {
  if (appYaIniciada) return;
  appYaIniciada = true;
  init();
}
window.iniciarApp = iniciarApp;