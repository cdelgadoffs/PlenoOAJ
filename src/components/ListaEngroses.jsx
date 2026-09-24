import { useEffect, useRef, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { getTituloPunto, padNumber } from '../utils/fechas.js';
import { cargarRemitentesCorreo } from '../utils/storage.js';
import { PLANTILLA_POR_DEFECTO } from '../utils/plantillasActa.js';
import { INTRO_ACTA_NOMBRE, INTRO_ACTA_RESTO, PUENTE_ACTA_TEXTO } from '../utils/textosActa.js';
import VistaPreviaFlotante from './VistaPreviaFlotante.jsx';
import DropdownSelect from './DropdownSelect.jsx';
import { generarZipEngroses } from '../utils/zipEngroses.js';
import '../styles/VistaPreviaFlotante.css';
import '../styles/ListaEngroses.css';

const OPCIONES_ESTADO = [
  { id: 'todos', label: 'Todos' },
  { id: 'enviados', label: 'Enviados' },
  { id: 'pendientes', label: 'Pendientes' }
];

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
  const { secciones, actualizarPunto, proyectoMeta, asistentes, secretarioEjecutivo } = useProyecto();
  const { setPreviewEngroseAbierta } = useUI();
  const [enviandoId, setEnviandoId] = useState(null);
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const [descargandoZip, setDescargandoZip] = useState(false);
  const [puntoVistaPreviaId, setPuntoVistaPreviaId] = useState(null);
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [filtroDependencia, setFiltroDependencia] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const remitentesCorreo = cargarRemitentesCorreo();
  const panelRef = useRef(null);
  const idsVistosRef = useRef(new Set());

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

  const idsKey = puntos.map(({ sec }) => sec.id).join(',');
  useEffect(() => {
    setSeleccionados(prev => {
      const next = new Set();
      puntos.forEach(({ sec }) => {
        if (prev.has(sec.id) || !idsVistosRef.current.has(sec.id)) next.add(sec.id);
      });
      idsVistosRef.current = new Set(puntos.map(({ sec }) => sec.id));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const dependencias = [...new Set(puntos.map(({ sec }) => sec.dependencia || 'Pleno'))].sort((a, b) => a.localeCompare(b));
  const opcionesDependencia = [
    { id: 'todas', label: 'Todas las dependencias' },
    ...dependencias.map(dep => ({ id: dep, label: dep }))
  ];

  const puntosFiltrados = puntos.filter(({ sec }) => {
    if (filtroDependencia !== 'todas' && (sec.dependencia || 'Pleno') !== filtroDependencia) return false;
    if (filtroEstado === 'enviados' && !sec.engroseEnviado) return false;
    if (filtroEstado === 'pendientes' && sec.engroseEnviado) return false;
    return true;
  });

  const totalEnviados = puntos.filter(({ sec }) => sec.engroseEnviado).length;
  const pendientesSeleccionados = puntos.filter(({ sec }) => !sec.engroseEnviado && seleccionados.has(sec.id)).length;
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
    const pendientes = puntos.filter(({ sec }) => !sec.engroseEnviado && seleccionados.has(sec.id));
    if (pendientes.length === 0) return;
    setEnviandoTodos(true);
    for (const { sec } of pendientes) {
      const correoDestino = remitentesCorreo[sec.dependencia];
      await enviarEngroseIndividual(sec, correoDestino);
      actualizarPunto(sec.id, { engroseEnviado: true });
    }
    setEnviandoTodos(false);
  }

  async function descargarZip() {
    setDescargandoZip(true);
    try {
      const puntosConCodigo = puntos.map(({ sec, idx }) => ({ sec, codigo: 'PLE/' + padNumber(idx + 1, 3) }));
      await generarZipEngroses(puntosConCodigo, proyectoMeta, asistentes, secretarioEjecutivo);
    } finally {
      setDescargandoZip(false);
    }
  }

  function toggleSeleccion(id) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
      <div className="engrose-toolbar">
        <div className="engrose-toolbar-izq">
          <button
            className="btn-confirm engrose-btn-todos"
            disabled={enviandoTodos || pendientesSeleccionados === 0}
            onClick={enviarTodos}
          >
            {enviandoTodos ? 'Enviando...' : `Enviar engroses seleccionados (${pendientesSeleccionados})`}
          </button>
          <div className="engrose-filtros">
            <DropdownSelect
              valorActual={filtroDependencia}
              etiquetaActual={opcionesDependencia.find(o => o.id === filtroDependencia)?.label || 'Todas las dependencias'}
              opciones={opcionesDependencia}
              onSeleccionar={setFiltroDependencia}
            />
            <DropdownSelect
              valorActual={filtroEstado}
              etiquetaActual={OPCIONES_ESTADO.find(o => o.id === filtroEstado)?.label || 'Todos'}
              opciones={OPCIONES_ESTADO}
              onSeleccionar={setFiltroEstado}
            />
          </div>
        </div>
        <button
          className="engrose-btn-zip"
          disabled={descargandoZip}
          onClick={descargarZip}
        >
          {descargandoZip ? 'Generando ZIP...' : 'Descargar ZIP de engroses'}
        </button>
      </div>
      <div className="engrose-lista">
        {puntosFiltrados.map(({ sec, idx }) => {
          const codigo = 'PLE/' + padNumber(idx + 1, 3);
          const correoDestino = remitentesCorreo[sec.dependencia];
          const resumen = (sec.contenido || 'Sin contenido').replace(/\*\*/g, '');
          const seleccionado = sec.id === puntoVistaPreviaId;
          const marcado = seleccionados.has(sec.id);
          return (
            <div
              key={sec.id}
              className={'engrose-item' + (sec.engroseEnviado ? ' enviado' : '') + (seleccionado ? ' selected' : '')}
              onClick={() => setPuntoVistaPreviaId(id => id === sec.id ? null : sec.id)}
            >
              {!sec.engroseEnviado && (
                <input
                  type="checkbox"
                  className="engrose-checkbox"
                  checked={marcado}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSeleccion(sec.id)}
                />
              )}
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
