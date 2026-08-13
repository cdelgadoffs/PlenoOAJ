// auth.js – Autenticación con Microsoft Entra ID (MSAL)

const msalConfig = {
  auth: {
    clientId: 'e9cdd347-5f61-4b4b-b509-c7d049bb58d3',
    authority: 'https://login.microsoftonline.com/857456d6-603c-4fa7-a6f6-3fadde5383ec',
    redirectUri: window.location.origin + window.location.pathname
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  }
};

// login
const loginRequest = {
  scopes: ['User.Read', 'Mail.Send', 'Files.ReadWrite'],
  prompt: 'consent'
};

if (typeof msal === 'undefined') {
  document.getElementById('loginError').textContent =
    'No se pudo cargar la librería de autenticación (MSAL). Verifica tu conexión a internet y recarga la página.';
  document.getElementById('btnLogin').disabled = true;
  throw new Error('MSAL no se cargó correctamente desde el CDN.');
}

const msalInstance = new msal.PublicClientApplication(msalConfig);

let cuentaActiva = null;
let rolesUsuario = [];
let msalInicializado = false;

const loginGate = document.getElementById('loginGate');
const appShell = document.getElementById('appShell');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const loginError = document.getElementById('loginError');
const loginLoading = document.getElementById('loginLoading');
const userNombre = document.getElementById('userNombre');
const sidebarNuevoSubtitle = document.getElementById('sidebarNuevoSubtitle');

btnLogin.disabled = true;

function mostrarError(msg) {
  loginError.textContent = msg;
}

function mostrarApp(cuenta) {
  cuentaActiva = cuenta;
  rolesUsuario = (cuenta.idTokenClaims && cuenta.idTokenClaims.roles) || [];
  userNombre.textContent = cuenta.name || cuenta.username;
  if (sidebarNuevoSubtitle) sidebarNuevoSubtitle.textContent = cuenta.username;
  loginGate.classList.add('hidden');
  appShell.classList.remove('hidden');
  if (typeof iniciarApp === 'function') {
    iniciarApp();
  }
}

function mostrarGate() {
  cuentaActiva = null;
  rolesUsuario = [];
  appShell.classList.add('hidden');
  loginGate.classList.remove('hidden');
  loginLoading.classList.add('hidden');
  btnLogin.disabled = !msalInicializado;
}

async function iniciarSesion() {
  mostrarError('');
  btnLogin.disabled = true;
  try {
    const resultado = await msalInstance.loginPopup(loginRequest);
    msalInstance.setActiveAccount(resultado.account);
    mostrarApp(resultado.account);
  } catch (err) {
    btnLogin.disabled = false;
    mostrarError('No se pudo iniciar sesión. Verifica tu cuenta institucional e intenta de nuevo.');
    console.error(err);
  }
}

function cerrarSesion() {
  const cuenta = msalInstance.getActiveAccount();
  msalInstance.logoutPopup({ account: cuenta }).then(() => {
    mostrarGate();
  }).catch(err => {
    console.error(err);
    mostrarGate();
  });
}

// Al cargar: inicializar MSAL (obligatorio en v3) y luego revisar sesión activa
(async function verificarSesionAlCargar() {
  loginLoading.classList.remove('hidden');
  try {
    await msalInstance.initialize();
    msalInicializado = true;
    await msalInstance.handleRedirectPromise();
    const cuentas = msalInstance.getAllAccounts();
    if (cuentas.length > 0) {
      msalInstance.setActiveAccount(cuentas[0]);
      mostrarApp(cuentas[0]);
    } else {
      mostrarGate();
    }
  } catch (err) {
    console.error(err);
    mostrarGate();
  }
})();

btnLogin.addEventListener('click', iniciarSesion);
btnLogout.addEventListener('click', cerrarSesion);

// Helper para el resto de la app: saber si el usuario tiene un rol dado
function tieneRol(rol) {
  return rolesUsuario.includes(rol);
}

// Helper para obtener un access token con scopes específicos (usado por email.js, y luego OneDrive)
async function obtenerAccessToken(scopes) {
  const cuenta = msalInstance.getActiveAccount();
  if (!cuenta) throw new Error('No hay sesión activa.');
  try {
    const resp = await msalInstance.acquireTokenSilent({ scopes, account: cuenta });
    return resp.accessToken;
  } catch (err) {
    const resp = await msalInstance.acquireTokenPopup({ scopes });
    return resp.accessToken;
  }
}
window.obtenerAccessToken = obtenerAccessToken;
window.tieneRol = tieneRol;