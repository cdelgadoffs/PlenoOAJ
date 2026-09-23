import { useEffect, useRef, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatearFechaES, padNumber } from '../utils/fechas.js';
import { diferenciaTexto } from '../utils/diffTexto.js';
import { crearCarpetaProyecto, crearCarpetaPunto, subirArchivoAOneDrive } from '../services/onedrive.js';
import { guardarArchivo, obtenerArchivo, eliminarArchivo } from '../utils/archivosDB.js';
import { generarWordPunto, WORD_MIME } from '../utils/wordPunto.js';
import { PLANTILLA_POR_DEFECTO, crearBloquesPorDefecto } from '../utils/plantillasActa.js';
import { INTRO_ACTA_NOMBRE, INTRO_ACTA_RESTO, PUENTE_ACTA_TEXTO } from '../utils/textosActa.js';
import EditorOcultable from './EditorOcultable.jsx';
import '../styles/SidebarTerciario.css';
import SelectorSeccionPunto from './SelectorSeccionPunto.jsx';
import DropdownSelect from './DropdownSelect.jsx';
import VistaPreviaFlotante from './VistaPreviaFlotante.jsx';
import '../styles/VistaPreviaFlotante.css';
import { CATEGORIAS, REMITENTES_POR_CATEGORIA, TODAS_DEPENDENCIAS } from '../utils/dependencias.js';

const INTRO_ACTA_MARKERS_POR_DEFECTO = `**${INTRO_ACTA_NOMBRE}**${INTRO_ACTA_RESTO}`;

function crearEstadoVacio() {
  return {
    categoria: 'pleno',
    remitente: 'Pleno',
    contenido: '',
    tipoVotacion: JSON.stringify({ voto: 0, votacion: 0, estado: true }),
    acuerdo: '',
    archivos: [],
    seccionDestino: 'proyectos de acuerdo',
    confidencial: false,
    bloquesActa: crearBloquesPorDefecto(PLANTILLA_POR_DEFECTO),
    plantilla: PLANTILLA_POR_DEFECTO,
    introTexto: INTRO_ACTA_MARKERS_POR_DEFECTO,
    puenteTexto: PUENTE_ACTA_TEXTO,
  };
}

export default function SidebarTerciario() {
  const { sidebarTerciarioAbierto, setSidebarTerciarioAbierto, vistaActual, setArchivosTemporales, setEliminarArchivoTemporalFn, setAvisosEdicionCorreo } = useUI();
  const { secciones, seccionActual, puntoEditandoId, setPuntoEditandoId, agregarPunto, editarPuntoExistente, setPuntoSeleccionadoId, proyectoMeta, setOneDriveFolder, asistentes } = useProyecto();
  const { obtenerAccessToken } = useAuth();
  const [form, setForm] = useState(crearEstadoVacio);
  const [oneDriveStatus, setOneDriveStatus] = useState('');
  const asideRef = useRef(null);

  useEffect(() => {
    if (!sidebarTerciarioAbierto) return;
    if (puntoEditandoId) {
      const sec = secciones.find(s => s.id === puntoEditandoId);
      if (!sec) return;
      const dep = sec.dependencia || 'Pleno';
      const categoria = TODAS_DEPENDENCIAS.find(d => d.id === dep)?.categoria || 'pleno';
      let tipoVotacion = sec.tipoVotacion || JSON.stringify({ voto: 0, votacion: 0, estado: true });
      const antiguos = ['Económica', 'Nominal', 'Cédula'];
      if (antiguos.includes(tipoVotacion)) {
        const mapeo = {
          'Económica': { voto: 0, votacion: 0, estado: true },
          'Nominal': { voto: 0, votacion: 1, estado: true },
          'Cédula': { voto: 0, votacion: 1, estado: true }
        };
        tipoVotacion = JSON.stringify(mapeo[tipoVotacion] || { voto: 0, votacion: 0, estado: true });
      }
      setForm({
        categoria,
        remitente: dep,
        contenido: sec.contenido || '',
        tipoVotacion,
        acuerdo: sec.acuerdo || 'Se aprueba por unanimidad',
        archivos: sec.archivos ? [...sec.archivos] : [],
        confidencial: sec.confidencial || false,
        bloquesActa: sec.bloquesActa ? sec.bloquesActa.map(b => ({ ...b })) : [],
        plantilla: sec.plantilla || PLANTILLA_POR_DEFECTO,
        seccionDestino: sec.seccion || 'proyectos de acuerdo',
        introTexto: sec.introTexto ?? INTRO_ACTA_MARKERS_POR_DEFECTO,
        puenteTexto: sec.puenteTexto ?? PUENTE_ACTA_TEXTO
      });
    } else {
      setForm(crearEstadoVacio());
    }
    setOneDriveStatus('');
  }, [sidebarTerciarioAbierto, puntoEditandoId]);

  useEffect(() => {
    if (vistaActual !== 'proyecto' && sidebarTerciarioAbierto) {
      setSidebarTerciarioAbierto(false);
      setPuntoEditandoId(null);
    }
  }, [vistaActual]);

  useEffect(() => {
    if (sidebarTerciarioAbierto && seccionActual === 'aprobaciones') {
      setSidebarTerciarioAbierto(false);
      setPuntoEditandoId(null);
    }
  }, [seccionActual]);

  useEffect(() => {
    setArchivosTemporales(form.archivos);
  }, [form.archivos]);

  useEffect(() => {
    setEliminarArchivoTemporalFn(() => eliminarArchivoTemporal);
  }, [form.archivos]);

  useEffect(() => {
    if (!sidebarTerciarioAbierto) setArchivosTemporales([]);
  }, [sidebarTerciarioAbierto]);

  if (!sidebarTerciarioAbierto) {
    return <aside className="sidebar-terciario hidden" id="sidebarTerciario"></aside>;
  }

  const opcionesRemitente = (REMITENTES_POR_CATEGORIA[form.categoria] || ['Pleno']).map(id => ({ id, label: id }));
  const categoriaActual = CATEGORIAS.find(c => c.id === form.categoria) || CATEGORIAS[0];
  // El visor solo aparece cuando el usuario empieza a escribir de verdad
  // (contenido, acuerdo o el texto de alguna sección), no solo porque ya
  // haya secciones precargadas vacías por defecto. Esas secciones se
  // preparan igual "detrás de escena" (VistaPreviaFlotante las precarga sin
  // importar si es o no visible), así que en cuanto aparece ya las trae
  // listas según la plantilla elegida.
  const hayContenido = seccionActual !== 'informes' && !!(form.contenido.trim() || form.acuerdo.trim() || form.bloquesActa.some(b => b.texto && b.texto.trim()));

  function cambiarCategoria(categoria) {
    const opciones = REMITENTES_POR_CATEGORIA[categoria] || ['Pleno'];
    setForm(f => ({ ...f, categoria, remitente: opciones[0] }));
  }

  function adjuntarArchivos(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const procesos = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        alert(`El archivo ${file.name} excede 15MB y no será adjuntado.`);
        continue;
      }
      const id = 'arch_' + Date.now() + '_' + i;
      const rutaRelativa = file.webkitRelativePath || '';
      procesos.push(
        guardarArchivo(id, file).then(() => ({ id, nombre: file.name, tipo: file.type, rutaRelativa, _file: file }))
      );
    }
    if (procesos.length === 0) return;
    Promise.all(procesos).then((resultados) => {
      setForm(f => ({ ...f, archivos: [...f.archivos, ...resultados.map(({ _file, ...r }) => r)] }));
      e.target.value = '';
    }).catch(err => alert('Error al guardar archivos: ' + err.message));
  }

  function eliminarArchivoTemporal(idx) {
    setForm(f => ({ ...f, archivos: f.archivos.filter((_, i) => i !== idx) }));
  }

  function limpiarFormulario() {
    setForm(crearEstadoVacio());
    const inputArchivos = document.getElementById('archivosInput');
    const inputCarpeta = document.getElementById('carpetaInput');
    if (inputArchivos) inputArchivos.value = '';
    if (inputCarpeta) inputCarpeta.value = '';
  }

  function cerrar() {
    setPuntoEditandoId(null);
    setSidebarTerciarioAbierto(false);
  }

  // Genera el .docx de respaldo del punto (mismo contenido que VistaPreviaFlotante)
  // y lo mezcla con los archivos ya adjuntados, reemplazando la versión auto anterior si existía.
  async function conArchivoAutoAdjunto(contenido, acuerdo) {
    const anteriores = form.archivos.filter(a => !a.autogenerado);
    const autoPrevio = form.archivos.filter(a => a.autogenerado);
    const resultado = await generarWordPunto({ contenido, acuerdo, bloquesActa: form.bloquesActa, plantilla: form.plantilla, introTexto: form.introTexto, puenteTexto: form.puenteTexto }, proyectoMeta);
    if (!resultado) return form.archivos;
    autoPrevio.forEach(a => { eliminarArchivo(a.id).catch(() => {}); });
    const archivoAutoId = 'arch_auto_' + Date.now();
    await guardarArchivo(archivoAutoId, resultado.blob);
    return [...anteriores, { id: archivoAutoId, nombre: resultado.nombreArchivo, tipo: WORD_MIME, autogenerado: true }];
  }

  async function confirmar() {
    const contenido = form.contenido.trim();
    const acuerdo = form.acuerdo.trim();
    if (!contenido || (seccionActual !== 'informes' && !acuerdo)) {
      alert('Debes completar el punto de acuerdo y los acuerdos antes de añadir el punto.');
      return;
    }
    const archivosConAuto = seccionActual === 'informes'
      ? form.archivos
      : await conArchivoAutoAdjunto(contenido, acuerdo);
    if (puntoEditandoId) {
      const anterior = secciones.find(s => s.id === puntoEditandoId);
      const idx = secciones.findIndex(s => s.id === puntoEditandoId);
      const codigoPunto = 'PLE/' + padNumber(idx + 1, 3);
      const textoAnterior = `${anterior?.contenido || ''} ${anterior?.acuerdo || ''}`;
      const textoNuevo = `${contenido} ${acuerdo}`;
      const diffCambio = diferenciaTexto(textoAnterior, textoNuevo);

      editarPuntoExistente(puntoEditandoId, {
        contenido,
        dependencia: form.remitente,
        tipoVotacion: form.tipoVotacion,
        acuerdo,
        archivos: archivosConAuto,
        confidencial: form.confidencial,
        bloquesActa: form.bloquesActa,
        plantilla: form.plantilla,
        introTexto: form.introTexto,
        puenteTexto: form.puenteTexto,
        seccion: form.seccionDestino
      });
      setPuntoSeleccionadoId(puntoEditandoId);
      setAvisosEdicionCorreo(prev => [
        ...prev.filter(a => a.puntoId !== puntoEditandoId),
        { id: crypto.randomUUID(), puntoId: puntoEditandoId, codigoPunto, dependencia: form.remitente, contenido, acuerdo, diffCambio }
      ]);
      setPuntoEditandoId(null);
      setForm(crearEstadoVacio());
      setSidebarTerciarioAbierto(false);
      return;
    }
    const desdeAG = seccionActual === 'asuntos generales';
    const seccionFinal = desdeAG
      ? (form.seccionDestino || 'proyectos de acuerdo')
      : seccionActual;

    const nuevoId = agregarPunto({
      contenido,
      dependencia: form.remitente,
      seccion: seccionFinal,
      tipoVotacion: form.tipoVotacion,
      acuerdo,
      archivos: archivosConAuto,
      origenAG: desdeAG,
      confidencial: form.confidencial,
      bloquesActa: form.bloquesActa,
      plantilla: form.plantilla,
      introTexto: form.introTexto,
      puenteTexto: form.puenteTexto
    });

    setPuntoSeleccionadoId(nuevoId);
    if (form.archivos.length > 0) {
      subirArchivosAOneDrive(nuevoId, form.archivos);
    }
    setForm(f => ({ ...f, contenido: '', acuerdo: '', archivos: [], bloquesActa: crearBloquesPorDefecto(PLANTILLA_POR_DEFECTO), plantilla: PLANTILLA_POR_DEFECTO, introTexto: INTRO_ACTA_MARKERS_POR_DEFECTO, puenteTexto: PUENTE_ACTA_TEXTO }));
  }

  async function subirArchivosAOneDrive(puntoId, archivos) {
    setOneDriveStatus('Vinculando carpeta del proyecto en OneDrive...');
    try {
      let folderId = proyectoMeta.oneDriveFolderId;
      if (!folderId) {
        const fechaFormateada = formatearFechaES(proyectoMeta.fecha);
        const nombreCarpetaProyecto = `Sesión ${proyectoMeta.tipoSesion} ${proyectoMeta.numeroSesion} del Pleno ${fechaFormateada}`;
        const anioSesion = (proyectoMeta.fecha || '').split('-')[0];
        const carpetaProyecto = await crearCarpetaProyecto(obtenerAccessToken, nombreCarpetaProyecto, anioSesion);
        folderId = carpetaProyecto.id;
        setOneDriveFolder({ oneDriveFolderId: carpetaProyecto.id, oneDriveFolderNombre: nombreCarpetaProyecto, oneDriveFolderUrl: carpetaProyecto.webUrl || '' });
      }
      const posicion = secciones.length + 1;
      const nombreCarpetaPunto = `Punto de acuerdo ${posicion}`;
      setOneDriveStatus(`Subiendo archivos a OneDrive (${nombreCarpetaPunto})...`);
      const carpetaPunto = await crearCarpetaPunto(obtenerAccessToken, folderId, nombreCarpetaPunto);
      let errores = 0;
      for (const archivo of archivos) {
        try {
          const blob = await obtenerArchivo(archivo.id);
          if (!blob) { errores++; continue; }
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          await subirArchivoAOneDrive(obtenerAccessToken, carpetaPunto.id, archivo.nombre, dataUrl, archivo.tipo);
        } catch (errArchivo) {
          errores++;
          console.error(`No se pudo subir "${archivo.nombre}" a OneDrive:`, errArchivo);
        }
      }
      setOneDriveStatus(errores === 0 ? `Archivos subidos a OneDrive (${nombreCarpetaPunto}).` : `${errores} archivo(s) no se pudieron subir a OneDrive.`);
    } catch (err) {
      console.error('No se pudo subir a OneDrive:', err);
      setOneDriveStatus('No se pudo subir a OneDrive. Verifica los permisos de Files.ReadWrite en Azure.');
    }
  }

  return (
    <>
      <aside className="sidebar-terciario" id="sidebarTerciario" ref={asideRef}>
        <div className="sb-header">
          <div className="sb-badge">{puntoEditandoId ? 'Editar punto' : 'Nuevo punto'}</div>
        </div>
        <div className="ter-form" key={seccionActual}>
          <div className="ter-field" style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: '1' }}>
              <label className="ter-label">Categoría</label>
              <DropdownSelect
                valorActual={categoriaActual.id}
                etiquetaActual={categoriaActual.label}
                opciones={CATEGORIAS}
                onSeleccionar={cambiarCategoria}
              />
            </div>
            <div style={{ flex: '1' }}>
              <label className="ter-label">Remitente</label>
              <DropdownSelect
                valorActual={form.remitente}
                etiquetaActual={form.remitente}
                opciones={opcionesRemitente}
                onSeleccionar={(id) => setForm(f => ({ ...f, remitente: id }))}
              />
            </div>
          </div>
          {seccionActual === 'asuntos generales' && (
            <SelectorSeccionPunto
              valor={form.seccionDestino}
              onChange={(v) => setForm(f => ({ ...f, seccionDestino: v }))}
            />
          )}
          <div className="ter-field">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Adjuntar archivos</label>
              <input type="file" id="archivosInput" multiple style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', fontSize: '12px' }} onChange={adjuntarArchivos} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Adjuntar carpetas</label>
              <input
                type="file"
                id="carpetaInput"
                webkitdirectory=""
                directory=""
                multiple
                style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', fontSize: '12px' }}
                onChange={adjuntarArchivos}
              />
            </div>
            <div id="listaArchivosTemporales" style={{ marginTop: '6px', fontSize: '12px', color: '#555', maxHeight: '60px', overflowY: 'auto' }}>
            </div>
            <div id="oneDriveStatus" className="onedrive-status">{oneDriveStatus}</div>
          </div>
          <div className="ter-field ter-field-grow">
            <EditorOcultable
              id="cuerpoTextarea"
              value={form.contenido}
              onChange={(v) => setForm(f => ({ ...f, contenido: v }))}
              placeholder={seccionActual === 'informes' ? 'Informe' : 'Punto de acuerdo'}
              negritaTotal
            />
          </div>
          {seccionActual !== 'informes' && (
            <div className="ter-field">
              <label className="ter-label">Acuerdo</label>
              <EditorOcultable
                id="acuerdoSelect"
                value={form.acuerdo}
                onChange={(v) => setForm(f => ({ ...f, acuerdo: v }))}
                placeholder="Acuerdos"
                modoAcuerdo
              />
            </div>
          )}
          {puntoEditandoId && (
            <SelectorSeccionPunto
              valor={form.seccionDestino}
              onChange={(v) => setForm(f => ({ ...f, seccionDestino: v }))}
            />
          )}

          <div className="ter-acciones">
            <div className="ter-field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="checkConfidencial"
                checked={form.confidencial}
                onChange={(e) => setForm(f => ({ ...f, confidencial: e.target.checked }))}
              />
              <label htmlFor="checkConfidencial" style={{ fontSize: '12px', fontWeight: '600', color: '#c0392b', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}>
                Marcar como CONFIDENCIAL
              </label>
            </div>
            <button className="btn-cancel" id="btnCancelarCreacion" onClick={cerrar}>Cancelar</button>
            <button className="btn-confirm" id="btnConfirmarCreacion" disabled={!form.contenido.trim() || (seccionActual !== 'informes' && !form.acuerdo.trim())} onClick={confirmar}>{puntoEditandoId ? 'Guardar cambios' : 'Añadir'}</button>
            <button className="btn-clear" id="btnLimpiarFormulario" title="Borrar formulario" onClick={limpiarFormulario}>
              <i className="fas fa-eraser"></i>
            </button>
          </div>
        </div>
      </aside>

    <VistaPreviaFlotante form={form} setForm={setForm} visible={hayContenido} anclaRef={asideRef} />
    </>
  );
}