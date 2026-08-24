import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';

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

const loginRequest = {
  scopes: ['User.Read', 'Mail.Send', 'Files.ReadWrite'],
  prompt: 'consent'
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const msalRef = useRef(null);
  const [msalListo, setMsalListo] = useState(false);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [rolesUsuario, setRolesUsuario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const instancia = new PublicClientApplication(msalConfig);
        await instancia.initialize();
        msalRef.current = instancia;
        await instancia.handleRedirectPromise();
        const cuentas = instancia.getAllAccounts();
        if (!cancelado) {
          setMsalListo(true);
          if (cuentas.length > 0) {
            instancia.setActiveAccount(cuentas[0]);
            aplicarCuenta(cuentas[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  function aplicarCuenta(cuenta) {
    setCuentaActiva(cuenta);
    setRolesUsuario((cuenta.idTokenClaims && cuenta.idTokenClaims.roles) || []);
  }

  const iniciarSesion = useCallback(async () => {
    setError('');
    try {
      const resultado = await msalRef.current.loginPopup(loginRequest);
      msalRef.current.setActiveAccount(resultado.account);
      aplicarCuenta(resultado.account);
    } catch (err) {
      console.error(err);
      setError('No se pudo iniciar sesión. Verifica tu cuenta institucional e intenta de nuevo.');
      throw err;
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    const cuenta = msalRef.current.getActiveAccount();
    try {
      await msalRef.current.logoutPopup({ account: cuenta });
    } catch (err) {
      console.error(err);
    } finally {
      setCuentaActiva(null);
      setRolesUsuario([]);
    }
  }, []);

  const tieneRol = useCallback((rol) => rolesUsuario.includes(rol), [rolesUsuario]);

  const obtenerAccessToken = useCallback(async (scopes) => {
    const cuenta = msalRef.current.getActiveAccount();
    if (!cuenta) throw new Error('No hay sesión activa.');
    try {
      const resp = await msalRef.current.acquireTokenSilent({ scopes, account: cuenta });
      return resp.accessToken;
    } catch (err) {
      const resp = await msalRef.current.acquireTokenPopup({ scopes });
      return resp.accessToken;
    }
  }, []);

  const value = {
    msalListo,
    cargando,
    error,
    cuentaActiva,
    rolesUsuario,
    tieneRol,
    iniciarSesion,
    cerrarSesion,
    obtenerAccessToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
