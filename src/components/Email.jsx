import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';

const DESTINATARIOS_FICTICIOS = [
  { nombre: 'Secretaría General', correo: 'secretaria.general@ejemplo-institucion.gob' },
  { nombre: 'Presidencia', correo: 'presidencia@ejemplo-institucion.gob' },
  { nombre: 'Dirección Jurídica', correo: 'direccion.juridica@ejemplo-institucion.gob' }
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Email({ onVolver }) {
  const { obtenerAccessToken } = useAuth();
  const { secciones } = useProyecto();

  const [destinatariosMarcados, setDestinatariosMarcados] = useState([]);
  const [invitados, setInvitados] = useState([]);
  const [inputInvitado, setInputInvitado] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [docsMarcados, setDocsMarcados] = useState([]);
  const [status, setStatus] = useState({ texto: '', ok: false });
  const [enviando, setEnviando] = useState(false);

  const archivosDisponibles = [];
  secciones.forEach(sec => {
    (sec.archivos || []).forEach(archivo => archivosDisponibles.push({ archivo, puntoId: sec.id }));
  });

  function toggleDestinatario(correo) {
    setDestinatariosMarcados(prev => prev.includes(correo) ? prev.filter(c => c !== correo) : [...prev, correo]);
  }
  function toggleDoc(idx) {
    setDocsMarcados(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }
  function agregarInvitado() {
    const valor = inputInvitado.trim();
    if (!valor) return;
    if (!EMAIL_REGEX.test(valor)) { alert('Ingresa un correo electrónico válido.'); return; }
    if (invitados.includes(valor)) { setInputInvitado(''); return; }
    setInvitados(prev => [...prev, valor]);
    setInputInvitado('');
  }

  async function enviar() {
    const destinatarios = [...destinatariosMarcados, ...invitados];
    if (destinatarios.length === 0) { setStatus({ texto: 'Selecciona al menos un destinatario.', ok: false }); return; }
    if (!asunto.trim()) { setStatus({ texto: 'Ingresa un asunto.', ok: false }); return; }

    setEnviando(true);
    setStatus({ texto: 'Enviando...', ok: false });
    try {
      const accessToken = await obtenerAccessToken(['Mail.Send']);
      const adjuntos = docsMarcados.map(idx => archivosDisponibles[idx].archivo);
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
      const resp = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(mensaje)
      });
      if (!resp.ok) throw new Error(`Graph respondió ${resp.status}: ${await resp.text()}`);

      setStatus({ texto: 'Correo enviado correctamente.', ok: true });
      setAsunto(''); setCuerpo(''); setInvitados([]); setDestinatariosMarcados([]); setDocsMarcados([]);
    } catch (err) {
      console.error(err);
      setStatus({ texto: 'No se pudo enviar el correo. Verifica los permisos en Azure (Mail.Send).', ok: false });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="sb-nav nuevo-panel" id="panelEmailNuevo">
      <button className="btn-volver-nuevo" id="btnVolverMenuNuevo" onClick={onVolver}>‹ Volver</button>
      <div className="email-field">
        <label className="email-label">Destinatarios</label>
        <div id="listaDestinatariosFicticios" className="email-dest-lista">
          {DESTINATARIOS_FICTICIOS.map((d, idx) => (
            <div className="email-check-item" key={idx}>
              <input type="checkbox" id={'dest_' + idx} checked={destinatariosMarcados.includes(d.correo)} onChange={() => toggleDestinatario(d.correo)} />
              <label htmlFor={'dest_' + idx}>{d.nombre}</label>
            </div>
          ))}
        </div>
      </div>
      <div className="email-field">
        <label className="email-label">Agregar invitado</label>
        <div className="email-invitado-input">
          <input
            type="email" id="inputInvitadoEmail" placeholder="correo@ejemplo.com"
            value={inputInvitado}
            onChange={(e) => setInputInvitado(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarInvitado(); } }}
          />
          <button id="btnAgregarInvitado" className="btn-add-invitado" onClick={agregarInvitado}>+</button>
        </div>
        <div id="listaInvitados" className="email-invitados-lista">
          {invitados.length === 0
            ? <span className="email-vacio">Ningún invitado agregado</span>
            : invitados.map(correo => (
              <span key={correo} className="email-invitado-chip">
                {correo} <span className="eliminar-invitado" onClick={() => setInvitados(prev => prev.filter(c => c !== correo))}>✕</span>
              </span>
            ))}
        </div>
      </div>
      <div className="email-field">
        <label className="email-label">Asunto</label>
        <input type="text" id="emailAsunto" className="email-asunto-input" placeholder="Asunto del correo" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
      </div>
      <div className="email-field email-field-grow">
        <label className="email-label">Mensaje</label>
        <textarea id="emailCuerpo" className="email-textarea" placeholder="Redacta el mensaje..." value={cuerpo} onChange={(e) => setCuerpo(e.target.value)}></textarea>
      </div>
      <div className="email-field">
        <label className="email-label">Adjuntar documentos</label>
        <div id="listaDocumentosAdjuntos" className="email-doc-lista">
          {archivosDisponibles.length === 0
            ? <span className="email-vacio">No hay documentos adjuntos en el proyecto actual</span>
            : archivosDisponibles.map((item, idx) => (
              <div className="email-check-item" key={idx}>
                <input type="checkbox" id={'doc_' + idx} checked={docsMarcados.includes(idx)} onChange={() => toggleDoc(idx)} />
                <label htmlFor={'doc_' + idx}>{item.archivo.nombre}</label>
              </div>
            ))}
        </div>
      </div>
      <div id="emailStatus" className={'email-status' + (status.texto ? (status.ok ? ' ok' : ' error') : '')}>{status.texto}</div>
      <button id="btnEnviarEmail" className="btn-enviar-email" disabled={enviando} onClick={enviar}>Enviar correo</button>
    </div>
  );
}
