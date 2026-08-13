// ============================================================
// email.js – Panel de envío de correo (sidebar negro) vía Microsoft Graph
// ============================================================

// Destinatarios ficticios de prueba
const DESTINATARIOS_FICTICIOS = [
  { nombre: 'Secretaría General', correo: 'secretaria.general@ejemplo-institucion.gob' },
  { nombre: 'Presidencia', correo: 'presidencia@ejemplo-institucion.gob' },
  { nombre: 'Dirección Jurídica', correo: 'direccion.juridica@ejemplo-institucion.gob' }
];

let invitadosEmail = [];

// ========== REFERENCIAS DOM ==========
const menuItemEmail = document.getElementById('menuItemEmail');
const panelMenuNuevo = document.getElementById('panelMenuNuevo');
const panelEmailNuevo = document.getElementById('panelEmailNuevo');
const btnVolverMenuNuevo = document.getElementById('btnVolverMenuNuevo');
const listaDestinatariosFicticios = document.getElementById('listaDestinatariosFicticios');
const inputInvitadoEmail = document.getElementById('inputInvitadoEmail');
const btnAgregarInvitado = document.getElementById('btnAgregarInvitado');
const listaInvitados = document.getElementById('listaInvitados');
const emailAsunto = document.getElementById('emailAsunto');
const emailCuerpo = document.getElementById('emailCuerpo');
const listaDocumentosAdjuntos = document.getElementById('listaDocumentosAdjuntos');
const emailStatus = document.getElementById('emailStatus');
const btnEnviarEmail = document.getElementById('btnEnviarEmail');

// ========== PERMISOS (solo Editor/Admin) ==========
function actualizarVisibilidadMenuEmail() {
  if (!menuItemEmail) return;
  const puedeEnviar = typeof tieneRol === 'function' && (tieneRol('Editor') || tieneRol('Admin'));
  menuItemEmail.style.display = puedeEnviar ? '' : 'none';
}

// ========== VISTAS ==========
function abrirPanelEmail() {
  panelMenuNuevo.classList.add('hidden');
  panelEmailNuevo.classList.remove('hidden');
  renderDestinatariosFicticios();
  renderInvitados();
  renderDocumentosAdjuntos();
  emailStatus.textContent = '';
  emailStatus.className = 'email-status';
}

function volverAlMenuNuevo() {
  panelEmailNuevo.classList.add('hidden');
  panelMenuNuevo.classList.remove('hidden');
}

// ========== DESTINATARIOS FICTICIOS ==========
function renderDestinatariosFicticios() {
  listaDestinatariosFicticios.innerHTML = '';
  DESTINATARIOS_FICTICIOS.forEach((d, idx) => {
    const div = document.createElement('div');
    div.className = 'email-check-item';
    div.innerHTML = `
      <input type="checkbox" id="dest_${idx}" value="${d.correo}" />
      <label for="dest_${idx}">${d.nombre}</label>
    `;
    listaDestinatariosFicticios.appendChild(div);
  });
}

function obtenerDestinatariosSeleccionados() {
  const checks = listaDestinatariosFicticios.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checks).map(c => c.value);
}

// ========== INVITADOS ==========
function agregarInvitado() {
  const valor = inputInvitadoEmail.value.trim();
  if (!valor) return;
  const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!patronEmail.test(valor)) {
    alert('Ingresa un correo electrónico válido.');
    return;
  }
  if (invitadosEmail.includes(valor)) {
    inputInvitadoEmail.value = '';
    return;
  }
  invitadosEmail.push(valor);
  inputInvitadoEmail.value = '';
  renderInvitados();
}

function eliminarInvitado(correo) {
  invitadosEmail = invitadosEmail.filter(c => c !== correo);
  renderInvitados();
}

function renderInvitados() {
  if (invitadosEmail.length === 0) {
    listaInvitados.innerHTML = '<span class="email-vacio">Ningún invitado agregado</span>';
    return;
  }
  listaInvitados.innerHTML = invitadosEmail.map(correo => {
    return `<span class="email-invitado-chip">${correo} <span class="eliminar-invitado" data-correo="${correo}">✕</span></span>`;
  }).join(' ');
  listaInvitados.querySelectorAll('.eliminar-invitado').forEach(el => {
    el.addEventListener('click', function() {
      eliminarInvitado(this.dataset.correo);
    });
  });
}

// ========== DOCUMENTOS ADJUNTOS ==========
function obtenerTodosLosArchivos() {
  const resultado = [];
  if (typeof secciones === 'undefined') return resultado;
  secciones.forEach(sec => {
    if (sec.archivos && sec.archivos.length > 0) {
      sec.archivos.forEach(archivo => {
        resultado.push({ archivo, puntoId: sec.id, puntoContenido: sec.contenido });
      });
    }
  });
  return resultado;
}

function renderDocumentosAdjuntos() {
  const archivos = obtenerTodosLosArchivos();
  if (archivos.length === 0) {
    listaDocumentosAdjuntos.innerHTML = '<span class="email-vacio">No hay documentos adjuntos en el proyecto actual</span>';
    return;
  }
  listaDocumentosAdjuntos.innerHTML = archivos.map((item, idx) => {
    return `
      <div class="email-check-item">
        <input type="checkbox" id="doc_${idx}" data-idx="${idx}" />
        <label for="doc_${idx}">${item.archivo.nombre}</label>
      </div>
    `;
  }).join('');
}

function obtenerDocumentosSeleccionados() {
  const archivos = obtenerTodosLosArchivos();
  const checks = listaDocumentosAdjuntos.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checks).map(c => archivos[parseInt(c.dataset.idx)].archivo);
}

// ========== ENVÍO VÍA GRAPH ==========
async function enviarCorreoGraph(destinatarios, asunto, cuerpo, adjuntos) {
  const accessToken = await obtenerAccessToken(['Mail.Send']);

  const mensaje = {
    message: {
      subject: asunto,
      body: { contentType: 'Text', content: cuerpo },
      toRecipients: destinatarios.map(correo => ({ emailAddress: { address: correo } })),
      attachments: adjuntos.map(a => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: a.nombre,
        contentType: a.tipo || 'application/octet-stream',
        contentBytes: (a.data && a.data.includes(',')) ? a.data.split(',')[1] : ''
      }))
    },
    saveToSentItems: true
  };

  const respuesta = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mensaje)
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Graph respondió ${respuesta.status}: ${detalle}`);
  }
}

async function manejarEnvioCorreo() {
  const destinatarios = [...obtenerDestinatariosSeleccionados(), ...invitadosEmail];
  const asunto = emailAsunto.value.trim();
  const cuerpo = emailCuerpo.value.trim();
  const adjuntos = obtenerDocumentosSeleccionados();

  if (destinatarios.length === 0) {
    emailStatus.textContent = 'Selecciona al menos un destinatario.';
    emailStatus.className = 'email-status error';
    return;
  }
  if (!asunto) {
    emailStatus.textContent = 'Ingresa un asunto.';
    emailStatus.className = 'email-status error';
    return;
  }

  btnEnviarEmail.disabled = true;
  emailStatus.textContent = 'Enviando...';
  emailStatus.className = 'email-status';

  try {
    await enviarCorreoGraph(destinatarios, asunto, cuerpo, adjuntos);
    emailStatus.textContent = 'Correo enviado correctamente.';
    emailStatus.className = 'email-status ok';
    emailAsunto.value = '';
    emailCuerpo.value = '';
    invitadosEmail = [];
    renderInvitados();
    renderDestinatariosFicticios();
    renderDocumentosAdjuntos();
  } catch (err) {
    console.error(err);
    emailStatus.textContent = 'No se pudo enviar el correo. Verifica los permisos en Azure (Mail.Send).';
    emailStatus.className = 'email-status error';
  } finally {
    btnEnviarEmail.disabled = false;
  }
}

// ========== EVENTOS ==========
if (menuItemEmail) {
  menuItemEmail.addEventListener('click', abrirPanelEmail);
}
if (btnVolverMenuNuevo) {
  btnVolverMenuNuevo.addEventListener('click', volverAlMenuNuevo);
}
if (btnAgregarInvitado) {
  btnAgregarInvitado.addEventListener('click', agregarInvitado);
}
if (inputInvitadoEmail) {
  inputInvitadoEmail.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarInvitado();
    }
  });
}
if (btnEnviarEmail) {
  btnEnviarEmail.addEventListener('click', manejarEnvioCorreo);
}

const _iniciarAppOriginal = window.iniciarApp;
window.iniciarApp = function() {
  if (typeof _iniciarAppOriginal === 'function') _iniciarAppOriginal();
  actualizarVisibilidadMenuEmail();
};