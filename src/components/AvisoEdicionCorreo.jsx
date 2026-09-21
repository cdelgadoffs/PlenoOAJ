import { useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { cargarRemitentesCorreo } from '../utils/storage.js';
import '../styles/AvisoEdicionCorreo.css';

function truncar(texto, max = 140) {
  return texto.length > max ? texto.slice(0, max) + '…' : texto;
}

function conNegritas(texto) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) => {
    const m = parte.match(/^\*\*([^*]+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{parte}</span>;
  });
}

function FragmentoDiff({ diff }) {
  if (!diff || !diff.fragmento) return <>Se modificó el punto</>;
  if (diff.tipo === 'agregado') return <>Se añadió: "{conNegritas(truncar(diff.fragmento))}"</>;
  if (diff.tipo === 'eliminado') return <>Se eliminó: "{conNegritas(truncar(diff.fragmento))}"</>;
  return <>Se cambió "{conNegritas(truncar(diff.fragmentoAnterior))}" por "{conNegritas(truncar(diff.fragmento))}"</>;
}

function AvisoItem({ aviso, onQuitar }) {
  const [enviando, setEnviando] = useState(false);
  const { dependencia, codigoPunto, diffCambio } = aviso;
  const remitentesCorreo = cargarRemitentesCorreo();
  const correoDestino = remitentesCorreo[dependencia];

  async function enviarAviso() {
    setEnviando(true);
    await enviarAvisoIndividual(aviso, correoDestino);
    setEnviando(false);
    onQuitar();
  }

  return (
    <div className="aviso-edicion-item">
      <div className="aviso-edicion-item-header">
        <span className="aviso-edicion-titulo">Cambio en {codigoPunto}</span>
        <button className="aviso-edicion-cerrar" onClick={onQuitar}>✕</button>
      </div>
      <p>Se editó el punto {codigoPunto} de <strong>{dependencia}</strong></p>
      <p className="aviso-edicion-resumen"><FragmentoDiff diff={diffCambio} /></p>
      {correoDestino
        ? <p className="aviso-edicion-destinatario">{correoDestino}</p>
        : <p className="aviso-edicion-sin-correo">Esta dependencia no tiene un correo vinculado. Configúralo en Email → Gestionar contactos.</p>}
      <div className="aviso-edicion-acciones">
        <button className="aviso-edicion-btn-descartar" onClick={onQuitar}>Descartar</button>
        <button className="aviso-edicion-btn-enviar" disabled={!correoDestino || enviando} onClick={enviarAviso}>
          {enviando ? 'Enviando...' : 'Enviar aviso'}
        </button>
      </div>
    </div>
  );
}

async function enviarAvisoIndividual(aviso, correoDestino) {
  console.log('Payload de aviso de edición (pendiente de conectar con el backend de correo):', {
    destinatario: correoDestino,
    dependencia: aviso.dependencia,
    contenido: aviso.contenido
  });
  await new Promise(resolve => setTimeout(resolve, 300));
}

export default function AvisoEdicionCorreo() {
  const { avisosEdicionCorreo, setAvisosEdicionCorreo } = useUI();
  const [expandido, setExpandido] = useState(false);
  const [enviandoTodos, setEnviandoTodos] = useState(false);

  if (avisosEdicionCorreo.length === 0) return null;

  function quitarAviso(id) {
    setAvisosEdicionCorreo(prev => prev.filter(a => a.id !== id));
  }

  if (avisosEdicionCorreo.length === 1) {
    return (
      <div className="aviso-edicion-flotante">
        <AvisoItem aviso={avisosEdicionCorreo[0]} onQuitar={() => quitarAviso(avisosEdicionCorreo[0].id)} />
      </div>
    );
  }

  async function notificarTodos() {
    const remitentesCorreo = cargarRemitentesCorreo();
    const conCorreo = avisosEdicionCorreo.filter(a => remitentesCorreo[a.dependencia]);
    if (conCorreo.length === 0) {
      alert('Ninguna de las dependencias pendientes tiene un correo vinculado.');
      return;
    }
    setEnviandoTodos(true);
    for (const aviso of conCorreo) {
      await enviarAvisoIndividual(aviso, remitentesCorreo[aviso.dependencia]);
    }
    setEnviandoTodos(false);
    const idsEnviados = new Set(conCorreo.map(a => a.id));
    setAvisosEdicionCorreo(prev => prev.filter(a => !idsEnviados.has(a.id)));
    alert(`El flujo de envío será correcto (${conCorreo.length} de ${avisosEdicionCorreo.length} avisos). La integración con el backend de correo se conectará próximamente.`);
  }

  if (!expandido) {
    return (
      <button className="aviso-edicion-burbuja" key={avisosEdicionCorreo.length} onClick={() => setExpandido(true)}>
        <span className="aviso-edicion-icono">✉</span>
        {avisosEdicionCorreo.length} avisos pendientes
      </button>
    );
  }

  return (
    <div className="aviso-edicion-bandeja">
      <div className="aviso-edicion-header">
        <span className="aviso-edicion-icono">✉</span>
        <span className="aviso-edicion-titulo">Avisos pendientes ({avisosEdicionCorreo.length})</span>
        <button className="aviso-edicion-cerrar" onClick={() => setExpandido(false)} title="Minimizar">﹣</button>
      </div>
      <div className="aviso-edicion-notificar-todos">
        <button className="aviso-edicion-btn-enviar" disabled={enviandoTodos} onClick={notificarTodos}>
          {enviandoTodos ? 'Enviando...' : 'Notificar todos'}
        </button>
      </div>
      <div className="aviso-edicion-lista">
        {avisosEdicionCorreo.map(aviso => (
          <AvisoItem key={aviso.id} aviso={aviso} onQuitar={() => quitarAviso(aviso.id)} />
        ))}
      </div>
    </div>
  );
}
