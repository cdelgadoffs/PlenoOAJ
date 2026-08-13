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

// Estado para archivos temporales en creación
let archivosTemporales = [];

// === BÚSQUEDA ===
let terminoBusqueda = '';

const STORAGE_KEY = 'ordenDiaData';
const PROYECTO_META_KEY = 'proyectoMeta';
const SIDEBAR_DERECHO_KEY = 'sidebarDerechoOpen';
const NUEVO_SIDEBAR_KEY = 'nuevoSidebarOpen';

// ========== SECCIONES FIJAS DEL DOCUMENTO ==========
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

// ========== ROMANOS Y FORMATEO ==========
function toRoman(num) {
  const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV'];
  return roman[num-1] || num.toString();
}
function padNumber(num, length) {
  return String(num).padStart(length, '0');
}
// Devuelve la fecha de HOY en hora local como "YYYY-MM-DD" (evita el desfase de toISOString, que usa UTC).
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

// ========== FORMATEO DE FECHAS ==========
// Convierte un string "YYYY-MM-DD" (del input type=date) a un objeto Date en hora LOCAL.
// Evita el bug de que new Date('YYYY-MM-DD') se interprete como UTC y muestre el día anterior.
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

// ========== ACTUALIZAR PUNTO 2 ==========
function actualizarPunto2() {
  const punto2 = secciones.find(s => s.id === 'sec_fijo_2');
  if (!punto2) return;
  if (!proyectoMeta.fecha) return;
  const fechaAnterior = calcularFechaAnterior(proyectoMeta.fecha, 7);
  if (!fechaAnterior) return;
  const fechaFormateada = formatearFechaES(fechaAnterior);
  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  punto2.contenido = `Aprobación, en su caso, del acta de la sesión ${tipo.toLowerCase()} del ${fechaFormateada}.`;
  punto2.seccion = 'aprobaciones';
  punto2.clasificacion = 'Pleno';
  punto2.subbloque = 'Pleno';
  guardarEnLocalStorage();
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

// Formulario de creación en sidebar3
const filtroDependencia = document.getElementById('filtroDependencia');
const listaDependencias = document.getElementById('listaDependencias');
const depSeleccionadaDisplay = document.getElementById('depSeleccionadaDisplay');
const asuntoSelect = document.getElementById('asuntoSelect');
const cuerpoTextarea = document.getElementById('cuerpoTextarea');
const btnConfirmarCreacion = document.getElementById('btnConfirmarCreacion');
const btnCancelarCreacion = document.getElementById('btnCancelarCreacion');
const formSeccionActual = document.getElementById('formSeccionActual');

// Elementos para archivos adjuntos
const archivosInput = document.getElementById('archivosInput');
const btnAdjuntarArchivo = document.getElementById('btnAdjuntarArchivo');
const listaArchivosTemporales = document.getElementById('listaArchivosTemporales');
const oneDriveStatus = document.getElementById('oneDriveStatus');
const contenedorClasificaciones = document.getElementById('contenedorClasificaciones');

// Modal de previsualización
const modalPreview = document.getElementById('modalPrevisualizacion');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');
const btnCerrarPreview = document.getElementById('btnCerrarPreview');
const btnCerrarPreview2 = document.getElementById('btnCerrarPreview2');

// Modal de actas
const modalActa = document.getElementById('modalActa');
const actaTipoSesion = document.getElementById('actaTipoSesion');
const actaFecha = document.getElementById('actaFecha');
const actaConfirm = document.getElementById('actaConfirm');
const actaCancel = document.getElementById('actaCancel');

// Modal nuevo proyecto
const modalNuevo = document.getElementById('modalNuevoProyecto');
const confirmCheckbox = document.getElementById('confirmNewProject');
const modalNuevoConfirm = document.getElementById('modalNuevoConfirm');
const modalNuevoCancel = document.getElementById('modalNuevoCancel');
const nuevoTipoSesion = document.getElementById('nuevoTipoSesion');
const nuevoNumeroSesion = document.getElementById('nuevoNumeroSesion');
const nuevoFecha = document.getElementById('nuevoFecha');

// Nuevo sidebar negro
const sidebarNuevo = document.getElementById('sidebarNuevo');
const btnToggleNuevoSidebar = document.getElementById('btnToggleNuevoSidebar');

// ========== LISTA DE DEPENDENCIAS (con categoría) ==========
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

// ========== FUNCIÓN PARA RENDERIZAR LISTA DE DEPENDENCIAS ==========
function renderizarListaDependencias(filtroCategoria) {
  const lista = listaDependencias;
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
  const index = secciones.findIndex(s => s.id === id);
  if (index === -1) return;
  const nuevoIndex = index + direccion;
  if (nuevoIndex < 0 || nuevoIndex >= secciones.length) return;
  if (secciones[index].seccion !== secciones[nuevoIndex].seccion) return;
  [secciones[index], secciones[nuevoIndex]] = [secciones[nuevoIndex], secciones[index]];
  guardarEnLocalStorage();
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
  guardarEnLocalStorage();
}

// ========== BÚSQUEDA ==========
function puntoCoincide(punto, termino) {
  if (!termino) return true;
  const term = termino.toLowerCase().trim();
  if (!term) return true;
  // Buscar en contenido, dependencia, seccion, asunto, y título
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
  if (!terminoBusqueda) return secciones.slice(); // todos
  return secciones.filter(p => puntoCoincide(p, terminoBusqueda));
}

function aplicarFiltro() {
  const term = buscadorGlobal.value.trim();
  terminoBusqueda = term;
  // Mostrar/ocultar botón de limpiar
  clearSearchBtn.style.display = term ? 'inline' : 'none';
  
  // Re-renderizar según la vista actual
  if (vistaActual === 'inicio') {
    mostrarInicio(); // no hay mucho que filtrar en inicio, pero actualizamos resumen
    renderResumenClasificacion();
  } else if (vistaActual === 'proyecto') {
    mostrarProyecto(); // esto re-renderiza todo
  } else if (vistaActual === 'sesionPrevia') {
    renderSesionPrevia(); // re-renderiza la vista previa
  } else if (vistaActual === 'actaSesion') {
    renderActaSesion();
  }
}

// ========== RENDER DE SECCIONES EN SIDEBAR 2 ==========
function renderSecciones() {
  const nav = document.getElementById('navSecundario');
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
      div.classList.add('disabled'); // opcional: ocultar completamente
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
    // Mostrar todos los puntos filtrados en una lista plana
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
              <span style="font-size:11px; color:#999;">${sec.seccion}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    panelPrincipal.innerHTML = html;
    
    // Agregar eventos a los puntos filtrados
    puntosFiltrados.forEach(sec => {
      const card = document.querySelector(`.punto-card[data-id="${sec.id}"]`);
      if (!card) return;
      card.addEventListener('click', function(e) {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label') || e.target.closest('.checkbox-group') || e.target.closest('.archivo-item')) return;
        if (puntoSeleccionadoId === sec.id) return;
        puntoSeleccionadoId = sec.id;
        // Cambiar a la sección del punto seleccionado y re-renderizar sin filtro? O mantener filtro?
        // Para no perder el filtro, actualizamos la selección y re-renderizamos con filtro.
        seccionActual = sec.seccion;
        document.querySelectorAll('#navSecundario .nav-item').forEach(el => {
          el.classList.toggle('active', el.dataset.seccion === seccionActual);
        });
        renderPanelPrincipal();
        renderSidebarDerecho();
        actualizarBadgesYVisibilidad();
        actualizarEstadoBotonesYBloques();
      });
      // Eventos de archivos y anexos (similares al original)
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
          guardarEnLocalStorage();
          renderSidebarDerecho();
        });
      }
    });
    return;
  }
  
  // --- SIN FILTRO: comportamiento original ---
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
        guardarEnLocalStorage();
        renderSidebarDerecho();
      });
    }
    
    document.getElementById('btnSubir_' + sec.id)?.addEventListener('click', () => {
      moverPunto(sec.id, -1);
    });
    document.getElementById('btnBajar_' + sec.id)?.addEventListener('click', () => {
      moverPunto(sec.id, 1);
    });
    const btnEliminar = document.getElementById('btnEliminar_' + sec.id);
    if (btnEliminar && !sec.fijo) {
      btnEliminar.addEventListener('click', () => {
        if (confirm(`¿Eliminar "${getTituloPunto(sec, secciones.indexOf(sec))}"?`)) {
          const index = secciones.findIndex(s => s.id === sec.id);
          if (index > 0 && !secciones[index].fijo) {
            secciones.splice(index, 1);
            guardarEnLocalStorage();
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
}

function cerrarCreacion() {
  sidebarTerciario.classList.add('hidden');
  btnAgregar.disabled = false;
  renderPanelPrincipal();
}

function agregarPunto() {
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
  guardarEnLocalStorage();
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

  // Subida a OneDrive en segundo plano (no bloquea la interfaz).
  if (nuevaSec.archivos.length > 0) {
    subirArchivosDelPuntoAOneDrive(nuevaSec, insertIdx);
  }
}

// Crea la carpeta "Punto de acuerdo {N}" (N = posición global del punto) dentro de
// la carpeta del proyecto en OneDrive, y sube ahí los archivos ya adjuntos al punto.
async function subirArchivosDelPuntoAOneDrive(sec, posicionGlobal) {
  // Auto-reparación: si el proyecto actual se creó antes de tener integración con
  // OneDrive (o falló al crearse), intentamos crear/vincular la carpeta ahora mismo.
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
    guardarEnLocalStorage();
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

// ========== PREVISUALIZACIÓN DE ARCHIVOS ==========
function abrirModalPrevisualizacion(archivo) {
  // archivo: {nombre, tipo, data}
  previewTitle.textContent = archivo.nombre;
  const content = previewContent;
  content.innerHTML = '';
  
  // Detectar si el archivo tiene vista previa soportada
  const tieneVistaPrevia = archivo.tipo.startsWith('image/') || 
                           archivo.tipo === 'application/pdf' || 
                           archivo.tipo.startsWith('text/');
  
  // Ajustar tamaño del modal según el tipo
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
    // Sin vista previa: mostramos botón de descarga
    content.innerHTML = `
      <p style="margin-bottom: 16px;">No se puede mostrar vista previa de este tipo de archivo (${archivo.tipo}).</p>
      <button id="btnDescargarArchivo" class="btn-confirm" style="padding: 8px 24px; font-size: 14px;">Descargar archivo</button>
    `;
    document.getElementById('btnDescargarArchivo').addEventListener('click', function() {
      // Crear un enlace temporal para descargar
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
  // Restablecer clases del modal
  const modalContent = modalPreview.querySelector('.modal-content');
  modalContent.classList.remove('modal-preview-full', 'modal-preview-compact');
}

// ========== POBLAR FILTRO DE DEPENDENCIAS EN SIDEBAR DERECHO ==========
function poblarFiltroDependencias() {
  const select = filtroDependenciaEsquema;
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

// ========== RESUMEN DE CLASIFICACIONES (SIDEBAR PRIMARIO) ==========
function renderResumenClasificacion() {
  const container = contenedorClasificaciones;
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
}

function mostrarProyecto() {
  if (secciones.length === 0) {
    vistaActual = 'proyecto';
    document.querySelectorAll('#navPrincipal .nav-item[data-vista]').forEach(el => el.classList.remove('active'));
    document.querySelector('#navPrincipal .nav-item[data-vista="proyecto"]').classList.add('active');
    sidebarSecundario.classList.remove('hidden');
    sidebarTerciario.classList.add('hidden');
    btnToggleDerecho.classList.remove('hidden');
    btnAgregar.style.display = 'flex';
    btnAprobarTodos.style.display = 'none';
    secBadgeLabel.textContent = 'Secciones';
    document.getElementById('btnGenerarPDFSidebar').style.display = 'block';
    actualizarTituloSidebar();
    renderSecciones();
    actualizarBadgesYVisibilidad();
    actualizarEstadoBotonesYBloques();
    renderSidebarDerecho();
    renderResumenClasificacion();
    poblarFiltroDependencias();
    const saved = localStorage.getItem(SIDEBAR_DERECHO_KEY);
    if (saved === 'true') toggleSidebarDerecho(true);
    else toggleSidebarDerecho(false);
    panelPrincipal.innerHTML = `
      <div class="placeholder-msg" style="margin-top:60px;">
        <strong>No hay un proyecto creado</strong><br>
        <button class="btn-generar" id="generarNuevaOrdenBtn">Generar nueva orden del día</button>
      </div>
    `;
    document.getElementById('generarNuevaOrdenBtn').addEventListener('click', abrirModalNuevoProyecto);
    return;
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
  
  // Si el punto seleccionado no está en los filtrados, seleccionar el primero de los filtrados
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
      guardarEnLocalStorage();
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

  // Evento para eliminar el punto
  document.getElementById('btnEliminarPrevia')?.addEventListener('click', function() {
    if (esFijo) return;
    if (confirm(`¿Eliminar "${titulo}"?`)) {
      const index = secciones.findIndex(s => s.id === sec.id);
      if (index !== -1 && !secciones[index].fijo) {
        secciones.splice(index, 1);
        guardarEnLocalStorage();
        // Seleccionar el siguiente punto disponible (o el anterior)
        const nuevosFiltrados = obtenerPuntosFiltrados();
        if (nuevosFiltrados.length > 0) {
          // Intentar seleccionar el mismo índice si existe, o el último
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

  // Eventos de votación y anotaciones
  document.getElementById('previaVotoSelect')?.addEventListener('change', function() {
    sec.voto = this.value;
    guardarEnLocalStorage();
  });
  document.getElementById('previaAnotaciones')?.addEventListener('input', function() {
    sec.anotaciones = this.value;
    guardarEnLocalStorage();
  });

  // Navegación anterior/siguiente
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
// Panel de revisión final de todos los puntos. Reutiliza el botón
// "Generar PDF" del sidebar principal (generarPDFConPrint) para producir
// el acta impresa vía window.print().
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

// ========== SIDEBAR DERECHO (ESQUEMA) ==========
function renderSidebarDerecho() {
  if (vistaActual === 'orden') return;
  navEsquema.innerHTML = '';
  const dependenciaFiltro = filtroDependenciaEsquema.value;
  let puntosBase = obtenerPuntosFiltrados(); // ya filtrados por búsqueda
  
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

// ========== TOGGLE NUEVO SIDEBAR NEGRO ==========
function toggleNuevoSidebar(forceState) {
  const isOpen = sidebarNuevo.classList.contains('open');
  const newState = (typeof forceState === 'boolean') ? forceState : !isOpen;
  sidebarNuevo.classList.toggle('open', newState);
  localStorage.setItem(NUEVO_SIDEBAR_KEY, newState ? 'true' : 'false');
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

// MODAL DE ACTAS
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
  guardarEnLocalStorage();
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

// MODAL NUEVO PROYECTO
function abrirModalNuevoProyecto() {
  const hoy = hoyLocalISO();
  nuevoFecha.value = hoy;
  nuevoTipoSesion.value = proyectoMeta.tipoSesion || 'Ordinaria';
  nuevoNumeroSesion.value = proyectoMeta.numeroSesion || 1;
  modalNuevo.classList.add('active');
  confirmCheckbox.checked = false;
  modalNuevoConfirm.disabled = true;
}
function cerrarModalNuevoProyecto() { modalNuevo.classList.remove('active'); }
async function confirmarNuevoProyecto() {
  if (!confirmCheckbox.checked) return;
  const tipo = nuevoTipoSesion.value;
  const numero = parseInt(nuevoNumeroSesion.value) || 1;
  const fecha = nuevoFecha.value;
  if (!fecha) { alert('Selecciona una fecha.'); return; }

  modalNuevoConfirm.disabled = true;
  modalNuevoConfirm.textContent = 'Creando carpeta en OneDrive...';

  proyectoMeta.tipoSesion = tipo;
  proyectoMeta.numeroSesion = numero;
  proyectoMeta.fecha = fecha;

  // Crear (o reutilizar) la carpeta del proyecto en OneDrive: "Sesiones {año}" / "Sesión {tipo} {n} del Pleno {fecha}"
  const fechaFormateadaCarpeta = formatearFechaES(fecha);
  const nombreCarpetaProyecto = `Sesión ${tipo} ${numero} del Pleno ${fechaFormateadaCarpeta}`;
  const anioSesion = fecha.split('-')[0];
  try {
    const carpetaProyecto = await window.oneDrive.crearCarpetaProyecto(nombreCarpetaProyecto, anioSesion);
    proyectoMeta.oneDriveFolderId = carpetaProyecto.id;
    proyectoMeta.oneDriveFolderNombre = nombreCarpetaProyecto;
    proyectoMeta.oneDriveFolderUrl = carpetaProyecto.webUrl || '';
  } catch (err) {
    console.error(err);
    alert('No se pudo crear la carpeta del proyecto en OneDrive. El proyecto se creará de todas formas, pero los archivos no se subirán hasta resolverlo. Verifica los permisos de Files.ReadWrite en Azure.');
  }
  guardarProyectoMeta();

  const punto1 = {
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
    archivos: []
  };
  const punto2 = {
    id: 'sec_fijo_2',
    clasificacion: 'Pleno',
    contenido: '',
    seccion: 'aprobaciones',
    subbloque: 'Pleno',
    fijo: true,
    anexo: false,
    voto: 'Pendiente',
    anotaciones: '',
    aprobado: false,
    archivos: []
  };
  const punto3 = {
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
    archivos: []
  };
  secciones = [punto1, punto2, punto3];
  actualizarPunto2();
  guardarEnLocalStorage();

  seccionActual = 'aprobaciones';
  puntoSeleccionadoId = punto1.id;
  cerrarModalNuevoProyecto();
  actualizarTituloSidebar();
  modalNuevoConfirm.disabled = false;
  modalNuevoConfirm.textContent = 'Crear nuevo proyecto';

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

// ========== INICIALIZACIÓN ==========
// init() se expone como iniciarApp() y es invocada por auth.js
// únicamente después de un inicio de sesión exitoso.
function init() {
  if (fechaActualEl) {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    fechaActualEl.textContent = ahora.toLocaleDateString('es-ES', opciones);
  }

  const metaGuardado = cargarProyectoMeta();
  if (metaGuardado) {
    proyectoMeta = metaGuardado;
  } else {
    const hoy = hoyLocalISO();
    proyectoMeta.fecha = hoy;
    proyectoMeta.tipoSesion = 'Ordinaria';
    proyectoMeta.numeroSesion = 1;
    guardarProyectoMeta();
  }
  actualizarTituloSidebar();

  const datos = cargarDesdeLocalStorage();
  if (datos && datos.length > 0) {
    secciones = datos;
    let necesitaGuardar = false;

    secciones.forEach(sec => {
      if (!sec.subbloque) {
        sec.subbloque = 'Pleno';
        necesitaGuardar = true;
      }
      if (!sec.clasificacion) {
        sec.clasificacion = 'Pleno';
        necesitaGuardar = true;
      }
      if (sec.anexo === undefined) sec.anexo = false;
      if (sec.voto === undefined) sec.voto = 'Pendiente';
      if (sec.anotaciones === undefined) sec.anotaciones = '';
      if (sec.aprobado === undefined) sec.aprobado = false;
      if (sec.fijo === undefined) sec.fijo = false;
      if (sec.dependencia === undefined) sec.dependencia = '';
      if (sec.asunto === undefined) sec.asunto = '';
      if (sec.archivos === undefined) {
        sec.archivos = [];
        necesitaGuardar = true;
      }
    });

    const idsFijos = ['sec_fijo_1', 'sec_fijo_2', 'sec_fijo_3'];
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
            aprobado: false,
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
    if (necesitaGuardar) guardarEnLocalStorage();

    const primeraConPuntos = secciones.find(s => SECCIONES_DEL_DOCUMENTO.includes(s.seccion));
    seccionActual = primeraConPuntos ? primeraConPuntos.seccion : 'aprobaciones';
    const pts = secciones.filter(s => s.seccion === seccionActual);
    puntoSeleccionadoId = pts.length > 0 ? pts[0].id : null;
  } else {
    secciones = [];
    seccionActual = 'aprobaciones';
    puntoSeleccionadoId = null;
  }

  // Restaurar estado del nuevo sidebar negro
  const nuevoState = localStorage.getItem(NUEVO_SIDEBAR_KEY);
  if (nuevoState === 'true') {
    sidebarNuevo.classList.add('open');
  } else {
    sidebarNuevo.classList.remove('open');
  }

  // === BÚSQUEDA: mostrar botón de limpiar si hay término guardado (ninguno al inicio) ===
  clearSearchBtn.style.display = 'none';

  mostrarInicio();

  // ===== EVENTOS =====
  document.querySelectorAll('#navPrincipal .nav-item[data-vista]').forEach(el => {
    el.addEventListener('click', function() {
      const vista = this.dataset.vista;
      if (vista === 'inicio') mostrarInicio();
      else if (vista === 'proyecto') mostrarProyecto();
      else if (vista === 'sesionPrevia') mostrarSesionPrevia();
      else if (vista === 'actaSesion') mostrarActaSesion();
    });
  });

  btnAgregar.addEventListener('click', abrirCreacion);
  btnAprobarTodos.addEventListener('click', function() {
    if (secciones.length === 0) return;
    const puntos = obtenerPuntosFiltrados();
    const todosAprobados = puntos.every(sec => sec.aprobado === true);
    puntos.forEach(sec => { sec.aprobado = !todosAprobados; });
    guardarEnLocalStorage();
    renderSesionPrevia();
  });
  btnCancelarCreacion.addEventListener('click', cerrarCreacion);
  btnConfirmarCreacion.addEventListener('click', agregarPunto);

  btnAdjuntarArchivo.addEventListener('click', adjuntarArchivos);

  // Eventos modal previsualización
  btnCerrarPreview.addEventListener('click', cerrarModalPrevisualizacion);
  btnCerrarPreview2.addEventListener('click', cerrarModalPrevisualizacion);
  modalPreview.addEventListener('click', function(e) {
    if (e.target === this) cerrarModalPrevisualizacion();
  });

  actaCancel.addEventListener('click', cerrarModalActa);
  modalActa.addEventListener('click', function(e) {
    if (e.target === this) cerrarModalActa();
  });
  actaConfirm.addEventListener('click', agregarActa);

  btnNuevoProyecto.addEventListener('click', abrirModalNuevoProyecto);
  document.getElementById('btnGenerarPDFSidebar')?.addEventListener('click', generarPDFConPrint);
  modalNuevoCancel.addEventListener('click', cerrarModalNuevoProyecto);
  modalNuevo.addEventListener('click', function(e) {
    if (e.target === this) cerrarModalNuevoProyecto();
  });
  confirmCheckbox.addEventListener('change', function() {
    modalNuevoConfirm.disabled = !this.checked;
  });
  modalNuevoConfirm.addEventListener('click', confirmarNuevoProyecto);

  btnToggleDerecho.addEventListener('click', () => toggleSidebarDerecho());
  btnCerrarDerecho.addEventListener('click', () => toggleSidebarDerecho(false));
  filtroDependenciaEsquema.addEventListener('change', renderSidebarDerecho);
  
  filtroDependencia.addEventListener('change', function() {
    renderizarListaDependencias(this.value);
  });

  // Evento para el nuevo sidebar negro
  btnToggleNuevoSidebar.addEventListener('click', toggleNuevoSidebar);

  // === BÚSQUEDA: eventos del buscador ===
  buscadorGlobal.addEventListener('input', aplicarFiltro);
  clearSearchBtn.addEventListener('click', function() {
    buscadorGlobal.value = '';
    aplicarFiltro();
  });

  renderResumenClasificacion();
  poblarFiltroDependencias();
}

let appYaIniciada = false;
function iniciarApp() {
  if (appYaIniciada) return;
  appYaIniciada = true;
  init();
}
window.iniciarApp = iniciarApp;