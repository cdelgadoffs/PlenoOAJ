import { useEffect, useRef, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { getTituloPunto, padNumber } from '../utils/fechas.js';
import { cargarRemitentesCorreo } from '../utils/storage.js';
import { PLANTILLA_POR_DEFECTO } from '../utils/plantillasActa.js';
import { INTRO_ACTA_NOMBRE, INTRO_ACTA_RESTO, PUENTE_ACTA_TEXTO } from '../utils/textosActa.js';
import VistaPreviaFlotante from './VistaPreviaFlotante.jsx';
import '../styles/VistaPreviaFlotante.css';
import '../styles/ListaEngroses.css';

async function enviarEngroseIndividual(punto, correoDestino) {
  console.log('Payload de engrose (pendiente de conectar con el backend de correo):', {
    destinatario: correoDestino,
    dependencia: punto.dependencia,
    contenido: punto.contenido,
    acuerdo: punto.acuerdo
  });
  await new Promise(resolve => setTimeout(resolve, 300));
}

export default function ListaEngroses() {
  const { secciones, actualizarPunto } = useProyecto();
  const { setPreviewEngroseAbierta } = useUI();
  const [enviandoId, setEnviandoId] = useState(null);
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const [puntoVistaPreviaId, setPuntoVistaPreviaId] = useState(null);
  const remitentesCorreo = cargarRemitentesCorreo();
  const panelRef = useRef(null);

  useEffect(() => {
    panelRef.current = document.getElementById('panelPrincipal');
  }, []);

  useEffect(() => {
    setPreviewEngroseAbierta(!!puntoVistaPreviaId);
    return () => setPreviewEngroseAbierta(false);
  }, [puntoVistaPreviaId, setPreviewEngroseAbierta]);

  const puntos = secciones
    .map((sec, idx) => ({ sec, idx }))
    .filter(({ sec }) => !(sec.fijo && sec.seccion === 'asuntos generales'));

  const totalEnviados = puntos.filter(({ sec }) => sec.engroseEnviado).length;
  const puntoVistaPrevia = secciones.find(s => s.id === puntoVistaPreviaId) || null;
  const idxVistaPrevia = puntoVistaPrevia ? secciones.indexOf(puntoVistaPrevia) : -1;
  const formVistaPrevia = {
    contenido: puntoVistaPrevia?.contenido || '',
    acuerdo: puntoVistaPrevia?.acuerdo || '',
    bloquesActa: puntoVistaPrevia?.bloquesActa || [],
    plantilla: puntoVistaPrevia?.plantilla || PLANTILLA_POR_DEFECTO,
    tipoVotacion: puntoVistaPrevia?.tipoVotacion || '',
    introTexto: puntoVistaPrevia?.introTexto ?? `**${INTRO_ACTA_NOMBRE}**${INTRO_ACTA_RESTO}`,
    puenteTexto: puntoVistaPrevia?.puenteTexto ?? PUENTE_ACTA_TEXTO
  };
  const codigoVistaPrevia = puntoVistaPrevia ? getTituloPunto(puntoVistaPrevia, idxVistaPrevia, secciones) : '';

  async function enviarUno(sec) {
    const correoDestino = remitentesCorreo[sec.dependencia];
    setEnviandoId(sec.id);
    await enviarEngroseIndividual(sec, correoDestino);
    actualizarPunto(sec.id, { engroseEnviado: true });
    setEnviandoId(null);
  }

  async function enviarTodos() {
    const pendientes = puntos.filter(({ sec }) => !sec.engroseEnviado);
    if (pendientes.length === 0) return;
    setEnviandoTodos(true);
    for (const { sec } of pendientes) {
      const correoDestino = remitentesCorreo[sec.dependencia];
      await enviarEngroseIndividual(sec, correoDestino);
      actualizarPunto(sec.id, { engroseEnviado: true });
    }
    setEnviandoTodos(false);
  }

  if (puntos.length === 0) {
    return <div className="placeholder-msg" style={{ marginTop: '60px' }}><strong>No hay puntos para engrosar</strong></div>;
  }

  return (
    <div className="engrose-wrap">
      <div className="doc-header">
        <div className="doc-title">Engroses de la sesión</div>
        <div className="doc-sub">{totalEnviados} de {puntos.length} enviados</div>
      </div>
      <button
        className="btn-confirm engrose-btn-todos"
        disabled={enviandoTodos || totalEnviados === puntos.length}
        onClick={enviarTodos}
      >
        {enviandoTodos ? 'Enviando...' : 'Enviar todos los engroses'}
      </button>
      <div className="engrose-lista">
        {puntos.map(({ sec, idx }) => {
          const codigo = 'PLE/' + padNumber(idx + 1, 3);
          const correoDestino = remitentesCorreo[sec.dependencia];
          const resumen = (sec.contenido || 'Sin contenido').replace(/\*\*/g, '');
          const seleccionado = sec.id === puntoVistaPreviaId;
          return (
            <div
              key={sec.id}
              className={'engrose-item' + (sec.engroseEnviado ? ' enviado' : '') + (seleccionado ? ' selected' : '')}
              onClick={() => setPuntoVistaPreviaId(id => id === sec.id ? null : sec.id)}
            >
              <div className="engrose-item-info">
                <div className="engrose-item-titulo">
                  <span className="engrose-item-codigo">{codigo}</span>
                  <span className="previa-tag engrose-badge">{sec.dependencia || 'Pleno'}</span>
                  {sec.engroseEnviado
                    ? <span className="engrose-estado enviado">Enviado</span>
                    : <span className="engrose-estado pendiente">Pendiente</span>}
                </div>
                <div className="engrose-item-resumen">{resumen}</div>
                {!correoDestino && (
                  <div className="engrose-sin-correo">Sin correo vinculado para {sec.dependencia || 'Pleno'}</div>
                )}
              </div>
              <button
                className="btn-confirm engrose-btn-enviar"
                disabled={!correoDestino || enviandoId === sec.id || enviandoTodos}
                onClick={(e) => { e.stopPropagation(); enviarUno(sec); }}
              >
                {enviandoId === sec.id ? 'Enviando...' : (sec.engroseEnviado ? 'Reenviar' : 'Enviar engrose')}
              </button>
            </div>
          );
        })}
      </div>
      <VistaPreviaFlotante
        form={formVistaPrevia}
        setForm={() => {}}
        visible={!!puntoVistaPrevia}
        anclaRef={panelRef}
        soloLectura
        codigoLectura={codigoVistaPrevia}
        remitenteLectura={puntoVistaPrevia?.dependencia || ''}
        onCerrarLectura={() => setPuntoVistaPreviaId(null)}
      />
    </div>
  );
}
