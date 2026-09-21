import { useState } from 'react';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { TODAS_DEPENDENCIAS } from '../utils/dependencias.js';
import DropdownSelect from './DropdownSelect.jsx';
import {
  cargarContactosEmail, guardarContactosEmail,
  cargarRemitentesCorreo, guardarRemitentesCorreo,
  cargarPlantillasEmail, guardarPlantillasEmail,
  cargarListasDestinatarios, guardarListasDestinatarios
} from '../utils/storage.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ChipInput({ label, placeholder, valores, onAgregar, onQuitar }) {
  const [input, setInput] = useState('');
  function agregar() {
    const valor = input.trim();
    if (!valor) return;
    if (!EMAIL_REGEX.test(valor)) { alert('Ingresa un correo electrónico válido.'); return; }
    if (valores.includes(valor)) { setInput(''); return; }
    onAgregar(valor);
    setInput('');
  }
  return (
    <div className="email-field">
      {label && <label className="email-label">{label}</label>}
      <div className="email-invitado-input">
        <input
          type="email" placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
        />
        <button className="btn-add-invitado" onClick={agregar}>+</button>
      </div>
      <div className="email-invitados-lista">
        {valores.length === 0
          ? <span className="email-vacio">Ninguno agregado</span>
          : valores.map(correo => (
            <span key={correo} className="email-invitado-chip">
              {correo} <span className="eliminar-invitado" onClick={() => onQuitar(correo)}>✕</span>
            </span>
          ))}
      </div>
    </div>
  );
}

async function archivoAAdjunto(file) {
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { nombre: file.name, tipo: file.type, data };
}

export default function Email({ onVolver, vista, setVista }) {
  const [contactos, setContactos] = useState(() => cargarContactosEmail());
  const [remitentesCorreo, setRemitentesCorreo] = useState(() => cargarRemitentesCorreo());
  const [plantillas, setPlantillas] = useState(() => cargarPlantillasEmail());
  const [listas, setListas] = useState(() => cargarListasDestinatarios());

  if (vista === 'gestion') {
    return (
      <PanelGestion
        onVolver={() => setVista('envio')}
        contactos={contactos} setContactos={setContactos}
        remitentesCorreo={remitentesCorreo} setRemitentesCorreo={setRemitentesCorreo}
        plantillas={plantillas} setPlantillas={setPlantillas}
        listas={listas} setListas={setListas}
      />
    );
  }

  return (
    <PanelEnvio
      onVolver={onVolver}
      contactos={contactos}
      remitentesCorreo={remitentesCorreo}
      plantillas={plantillas}
      listas={listas}
    />
  );
}

function PanelEnvio({ onVolver, contactos, remitentesCorreo, plantillas, listas }) {
  const { secciones } = useProyecto();

  const [dependenciaSeleccionada, setDependenciaSeleccionada] = useState(TODAS_DEPENDENCIAS[0]?.id || '');
  const [contactosMarcados, setContactosMarcados] = useState([]);
  const [destinatariosDependencia, setDestinatariosDependencia] = useState([]);
  const [invitados, setInvitados] = useState([]);
  const [cc, setCc] = useState([]);
  const [cco, setCco] = useState([]);

  const [listaSeleccionada, setListaSeleccionada] = useState('');
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');

  const [docsMarcados, setDocsMarcados] = useState([]);
  const [archivosExternos, setArchivosExternos] = useState([]);

  const [status, setStatus] = useState({ texto: '', ok: false });
  const [enviando, setEnviando] = useState(false);

  const archivosDisponibles = [];
  secciones.forEach(sec => {
    (sec.archivos || []).forEach(archivo => archivosDisponibles.push({ archivo, puntoId: sec.id }));
  });

  function toggleContacto(correo) {
    setContactosMarcados(prev => prev.includes(correo) ? prev.filter(c => c !== correo) : [...prev, correo]);
  }
  function toggleDoc(idx) {
    setDocsMarcados(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }
  function agregarRemitenteComoDestinatario() {
    const correo = remitentesCorreo[dependenciaSeleccionada];
    if (!correo) { alert('Esta dependencia aún no tiene un correo vinculado. Vincúlalo en "Gestionar contactos".'); return; }
    setDestinatariosDependencia(prev => prev.includes(correo) ? prev : [...prev, correo]);
  }
  function agregarLista(id) {
    setListaSeleccionada(id);
    const lista = listas.find(l => l.id === id);
    if (!lista) return;
    setInvitados(prev => Array.from(new Set([...prev, ...lista.correos])));
  }

  async function agregarArchivoExterno(e) {
    const files = Array.from(e.target.files || []);
    const nuevos = await Promise.all(files.map(archivoAAdjunto));
    setArchivosExternos(prev => [...prev, ...nuevos]);
    e.target.value = '';
  }
  function quitarArchivoExterno(idx) {
    setArchivosExternos(prev => prev.filter((_, i) => i !== idx));
  }

  function aplicarPlantilla(id) {
    setPlantillaSeleccionada(id);
    const plantilla = plantillas.find(p => p.id === id);
    if (plantilla) {
      setAsunto(plantilla.asunto);
      setCuerpo(plantilla.cuerpo);
    }
  }

  async function enviarCorreo(payload) {
    console.log('Payload de envío (pendiente de conectar con el backend de correo):', payload);
    alert('El flujo de envío será correcto. La integración con el backend de correo se conectará próximamente.');
  }

  async function enviar() {
    const destinatarios = [...destinatariosDependencia, ...contactosMarcados, ...invitados];
    if (destinatarios.length === 0) { setStatus({ texto: 'Selecciona al menos un destinatario.', ok: false }); return; }
    if (!asunto.trim()) { setStatus({ texto: 'Ingresa un asunto.', ok: false }); return; }

    setEnviando(true);
    setStatus({ texto: 'Enviando...', ok: false });
    try {
      const adjuntosProyecto = docsMarcados.map(idx => archivosDisponibles[idx].archivo);
      const payload = {
        destinatarios,
        cc,
        cco,
        asunto,
        cuerpo,
        adjuntos: [...adjuntosProyecto, ...archivosExternos]
      };
      await enviarCorreo(payload);

      setStatus({ texto: 'Correo enviado correctamente.', ok: true });
      setAsunto(''); setCuerpo(''); setInvitados([]); setCc([]); setCco([]);
      setDestinatariosDependencia([]); setContactosMarcados([]); setDocsMarcados([]); setArchivosExternos([]);
      setPlantillaSeleccionada(''); setListaSeleccionada('');
    } catch (err) {
      console.error(err);
      setStatus({ texto: 'No se pudo enviar el correo.', ok: false });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div id="panelEmailEnvio">
      <button className="btn-volver-nuevo" id="btnVolverMenuNuevo" onClick={onVolver}>‹ Volver</button>

      <div className="email-panel-grid">
        <div className="email-panel-row">
          <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo"><span className="cal-form-seccion-num">1</span>Destinatarios</div>
            <div className="email-field">
              <label className="email-label">Por dependencia</label>
              <div className="email-invitado-input">
                <DropdownSelect
                  valorActual={dependenciaSeleccionada}
                  etiquetaActual={dependenciaSeleccionada || 'Selecciona una dependencia'}
                  opciones={TODAS_DEPENDENCIAS.map(d => ({ id: d.id, label: d.id }))}
                  onSeleccionar={setDependenciaSeleccionada}
                />
                <button className="btn-add-invitado" onClick={agregarRemitenteComoDestinatario}>+</button>
              </div>
              <div className="email-invitados-lista">
                {destinatariosDependencia.length === 0
                  ? <span className="email-vacio">Ninguna dependencia agregada</span>
                  : destinatariosDependencia.map(correo => (
                    <span key={correo} className="email-invitado-chip">
                      {correo} <span className="eliminar-invitado" onClick={() => setDestinatariosDependencia(prev => prev.filter(c => c !== correo))}>✕</span>
                    </span>
                  ))}
              </div>
            </div>
            <div className="email-field">
              <label className="email-label">Contactos</label>
              <div className="email-dest-lista">
                {contactos.length === 0
                  ? <span className="email-vacio">No hay contactos guardados</span>
                  : contactos.map((c) => (
                    <div className="email-check-item" key={c.id}>
                      <input type="checkbox" id={'contacto_' + c.id} checked={contactosMarcados.includes(c.correo)} onChange={() => toggleContacto(c.correo)} />
                      <label htmlFor={'contacto_' + c.id}>{c.nombre} ({c.correo})</label>
                    </div>
                  ))}
              </div>
            </div>
            <div className="email-field">
              <label className="email-label">Lista de destinatarios</label>
              <DropdownSelect
                valorActual={listaSeleccionada}
                etiquetaActual={listas.find(l => l.id === listaSeleccionada)?.nombre || 'Agregar desde una lista'}
                opciones={[{ id: '', label: 'Agregar desde una lista' }, ...listas.map(l => ({ id: l.id, label: `${l.nombre} (${l.correos.length})` }))]}
                onSeleccionar={agregarLista}
              />
            </div>
            <ChipInput label="Agregar invitado" placeholder="correo@ejemplo.com" valores={invitados}
              onAgregar={(v) => setInvitados(prev => [...prev, v])}
              onQuitar={(v) => setInvitados(prev => prev.filter(c => c !== v))} />
          </div>

          <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo"><span className="cal-form-seccion-num">2</span>Copia</div>
            <ChipInput label="CC" placeholder="correo@ejemplo.com" valores={cc}
              onAgregar={(v) => setCc(prev => [...prev, v])}
              onQuitar={(v) => setCc(prev => prev.filter(c => c !== v))} />
            <ChipInput label="CCO" placeholder="correo@ejemplo.com" valores={cco}
              onAgregar={(v) => setCco(prev => [...prev, v])}
              onQuitar={(v) => setCco(prev => prev.filter(c => c !== v))} />

            <div className="cal-form-seccion-titulo" style={{ marginTop: '4px' }}><span className="cal-form-seccion-num">3</span>Adjuntos</div>
            <div className="email-field">
              <label className="email-label">Documentos del proyecto</label>
              <div className="email-doc-lista">
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
            <div className="email-field">
              <label className="email-label">Archivo externo</label>
              <input type="file" multiple onChange={agregarArchivoExterno} />
              <div className="email-invitados-lista">
                {archivosExternos.map((a, idx) => (
                  <span key={idx} className="email-invitado-chip">
                    {a.nombre} <span className="eliminar-invitado" onClick={() => quitarArchivoExterno(idx)}>✕</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="cal-form-seccion">
          <div className="cal-form-seccion-titulo"><span className="cal-form-seccion-num">4</span>Mensaje</div>
          <div className="email-field">
            <label className="email-label">Plantilla</label>
            <DropdownSelect
              valorActual={plantillaSeleccionada}
              etiquetaActual={plantillas.find(p => p.id === plantillaSeleccionada)?.nombre || 'Sin plantilla'}
              opciones={[{ id: '', label: 'Sin plantilla' }, ...plantillas.map(p => ({ id: p.id, label: p.nombre }))]}
              onSeleccionar={aplicarPlantilla}
            />
          </div>
          <div className="email-field">
            <label className="email-label">Asunto</label>
            <input type="text" className="email-asunto-input" placeholder="Asunto del correo" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          </div>
          <div className="email-field email-field-grow">
            <label className="email-label">Cuerpo</label>
            <textarea className="email-textarea" placeholder="Redacta el mensaje..." value={cuerpo} onChange={(e) => setCuerpo(e.target.value)}></textarea>
          </div>
        </div>

        <div id="emailStatus" className={'email-status' + (status.texto ? (status.ok ? ' ok' : ' error') : '')}>{status.texto}</div>
        <button id="btnEnviarEmail" className="btn-enviar-email" disabled={enviando} onClick={enviar}>Enviar correo</button>
      </div>
    </div>
  );
}

function PanelGestion({ onVolver, contactos, setContactos, remitentesCorreo, setRemitentesCorreo, plantillas, setPlantillas, listas, setListas }) {
  const [nombreContacto, setNombreContacto] = useState('');
  const [correoContacto, setCorreoContacto] = useState('');
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [asuntoPlantilla, setAsuntoPlantilla] = useState('');
  const [cuerpoPlantilla, setCuerpoPlantilla] = useState('');
  const [nombreLista, setNombreLista] = useState('');
  const [correosLista, setCorreosLista] = useState([]);

  function agregarContacto() {
    if (!nombreContacto.trim() || !EMAIL_REGEX.test(correoContacto.trim())) { alert('Ingresa un nombre y un correo válido.'); return; }
    const nuevos = [...contactos, { id: crypto.randomUUID(), nombre: nombreContacto.trim(), correo: correoContacto.trim() }];
    setContactos(nuevos);
    guardarContactosEmail(nuevos);
    setNombreContacto(''); setCorreoContacto('');
  }
  function eliminarContacto(id) {
    const nuevos = contactos.filter(c => c.id !== id);
    setContactos(nuevos);
    guardarContactosEmail(nuevos);
  }

  function actualizarCorreoRemitente(depId, correo) {
    const nuevos = { ...remitentesCorreo, [depId]: correo };
    setRemitentesCorreo(nuevos);
    guardarRemitentesCorreo(nuevos);
  }

  function agregarPlantilla() {
    if (!nombrePlantilla.trim() || !asuntoPlantilla.trim()) { alert('Ingresa un nombre y un asunto para la plantilla.'); return; }
    const nuevas = [...plantillas, { id: crypto.randomUUID(), nombre: nombrePlantilla.trim(), asunto: asuntoPlantilla.trim(), cuerpo: cuerpoPlantilla }];
    setPlantillas(nuevas);
    guardarPlantillasEmail(nuevas);
    setNombrePlantilla(''); setAsuntoPlantilla(''); setCuerpoPlantilla('');
  }
  function eliminarPlantilla(id) {
    const nuevas = plantillas.filter(p => p.id !== id);
    setPlantillas(nuevas);
    guardarPlantillasEmail(nuevas);
  }

  function agregarListaDestinatarios() {
    if (!nombreLista.trim() || correosLista.length === 0) { alert('Ingresa un nombre y al menos un correo para la lista.'); return; }
    const nuevas = [...listas, { id: crypto.randomUUID(), nombre: nombreLista.trim(), correos: correosLista }];
    setListas(nuevas);
    guardarListasDestinatarios(nuevas);
    setNombreLista(''); setCorreosLista([]);
  }
  function eliminarLista(id) {
    const nuevas = listas.filter(l => l.id !== id);
    setListas(nuevas);
    guardarListasDestinatarios(nuevas);
  }

  return (
    <div id="panelEmailGestion">
      <button className="btn-volver-nuevo" onClick={onVolver}>‹ Volver al envío</button>

      <div className="email-panel-grid">
        <div className="email-panel-row">
          <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo"><span className="cal-form-seccion-num">1</span>Contactos personales</div>
            <div className="email-invitado-input">
              <input type="text" placeholder="Nombre" value={nombreContacto} onChange={(e) => setNombreContacto(e.target.value)} />
              <input type="email" placeholder="correo@ejemplo.com" value={correoContacto} onChange={(e) => setCorreoContacto(e.target.value)} />
              <button className="btn-add-invitado" onClick={agregarContacto}>+</button>
            </div>
            <div className="email-dest-lista" style={{ marginTop: '8px' }}>
              {contactos.length === 0
                ? <span className="email-vacio">No hay contactos guardados</span>
                : contactos.map(c => (
                  <div className="email-check-item" key={c.id}>
                    <label style={{ flex: 1 }}>{c.nombre} ({c.correo})</label>
                    <span className="eliminar-invitado" onClick={() => eliminarContacto(c.id)}>✕</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo"><span className="cal-form-seccion-num">2</span>Correo por dependencia (remitente)</div>
            <div className="email-dest-lista">
              {TODAS_DEPENDENCIAS.map(dep => (
                <div className="email-check-item" key={dep.id}>
                  <label style={{ width: '110px' }}>{dep.id}</label>
                  <input
                    type="email" placeholder="correo@ejemplo.com"
                    value={remitentesCorreo[dep.id] || ''}
                    onChange={(e) => actualizarCorreoRemitente(dep.id, e.target.value)}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid #3a3a3a', borderRadius: '4px', background: '#2a2a2a', color: '#f0f0f0', fontSize: '12px' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="email-panel-row">
          <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo"><span className="cal-form-seccion-num">3</span>Plantillas de correo</div>
            <div className="email-invitado-input" style={{ flexWrap: 'wrap' }}>
              <input type="text" placeholder="Nombre de la plantilla" value={nombrePlantilla} onChange={(e) => setNombrePlantilla(e.target.value)} />
              <input type="text" placeholder="Asunto" value={asuntoPlantilla} onChange={(e) => setAsuntoPlantilla(e.target.value)} />
            </div>
            <textarea className="email-textarea" placeholder="Cuerpo de la plantilla" value={cuerpoPlantilla} onChange={(e) => setCuerpoPlantilla(e.target.value)}></textarea>
            <button className="btn-add-invitado" style={{ width: '100%', marginTop: '6px' }} onClick={agregarPlantilla}>Guardar plantilla</button>
            <div className="email-invitados-lista">
              {plantillas.length === 0
                ? <span className="email-vacio">No hay plantillas guardadas</span>
                : plantillas.map(p => (
                  <span key={p.id} className="email-invitado-chip">
                    {p.nombre} <span className="eliminar-invitado" onClick={() => eliminarPlantilla(p.id)}>✕</span>
                  </span>
                ))}
            </div>
          </div>

          <div className="cal-form-seccion">
            <div className="cal-form-seccion-titulo"><span className="cal-form-seccion-num">4</span>Listas de destinatarios</div>
            <input
              type="text" placeholder="Nombre de la lista (ej. Concejales)"
              className="email-asunto-input" style={{ marginBottom: '8px' }}
              value={nombreLista} onChange={(e) => setNombreLista(e.target.value)}
            />
            <ChipInput placeholder="correo@ejemplo.com" valores={correosLista}
              onAgregar={(v) => setCorreosLista(prev => [...prev, v])}
              onQuitar={(v) => setCorreosLista(prev => prev.filter(c => c !== v))} />
            <button className="btn-add-invitado" style={{ width: '100%' }} onClick={agregarListaDestinatarios}>Guardar lista</button>
            <div className="email-dest-lista" style={{ marginTop: '8px' }}>
              {listas.length === 0
                ? <span className="email-vacio">No hay listas guardadas</span>
                : listas.map(l => (
                  <div className="email-check-item" key={l.id}>
                    <label style={{ flex: 1 }}>{l.nombre} ({l.correos.length} correos)</label>
                    <span className="eliminar-invitado" onClick={() => eliminarLista(l.id)}>✕</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
