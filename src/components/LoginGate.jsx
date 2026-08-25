import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './LoginGate.css';

export default function LoginGate() {
  const { cuentaActiva, cargando, error, msalListo, iniciarSesion } = useAuth();
  const [autenticando, setAutenticando] = useState(false);
  const [fechaHoy, setFechaHoy] = useState('');

  useEffect(() => {
    const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setFechaHoy(new Date().toLocaleDateString('es-ES', opciones));
  }, []);

  if (cuentaActiva) return null;

  async function manejarLogin() {
    setAutenticando(true);
    try {
      await iniciarSesion();
    } catch {
    } finally {
      setAutenticando(false);
    }
  }

  return (
    <div className="lg-gate" id="loginGate">
      <div className="lg-panel-oscuro">
        <div className="lg-ledger" aria-hidden="true">
          <span>I.</span><span>II.</span><span>III.</span>
        </div>
        <div className="lg-oscuro-contenido">
          <img
            src="https://raw.githubusercontent.com/cdelgadoffs/CGD/535876195bedc1b602f98438ee3a42ff11cbb817/logo.png"
            alt="Logo institucional"
            className="lg-logo"
          />
          <div className="lg-eyebrow">OAJ · SISTEMA DE SESIONES</div>
          <h1 className="lg-titulo">
            Generador de<br />Orden del Día
          </h1>
          <p className="lg-descripcion">
            Planeación, votación y actas del Pleno del Órgano de Administración Judicial,
            en un solo lugar.
          </p>
          <div className="lg-fecha">{fechaHoy}</div>
        </div>
      </div>

      <div className="lg-panel-claro">
        <div className="lg-box">
          <div className="lg-box-eyebrow">Acceso institucional</div>
          <h2 className="lg-box-titulo">Inicia sesión</h2>
          <p className="lg-box-sub">Acceso restringido a cuentas institucionales autorizadas.</p>

          <button
            id="btnLogin"
            className="lg-btn"
            disabled={!msalListo || autenticando}
            onClick={manejarLogin}
          >
            {autenticando ? <span className="lg-spinner" aria-hidden="true"></span> : null}
            {autenticando ? 'Verificando…' : 'Iniciar sesión con Microsoft'}
          </button>

          <div id="loginError" className="lg-error">{error}</div>
          <div id="loginLoading" className={'lg-loading' + (cargando ? '' : ' lg-hidden')}>
            <span className="lg-spinner" aria-hidden="true"></span> Verificando sesión...
          </div>

          <div className="lg-box-footer">Órgano de Administración Judicial</div>
        </div>
      </div>
    </div>
  );
}
