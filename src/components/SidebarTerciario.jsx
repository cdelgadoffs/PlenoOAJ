import { useEffect, useRef, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatearFechaES } from '../utils/fechas.js';
import { crearCarpetaProyecto, crearCarpetaPunto, subirArchivoAOneDrive } from '../services/onedrive.js';
import { guardarArchivo, obtenerArchivo, eliminarArchivo } from '../utils/archivosDB.js';
import mammoth from 'mammoth';
import { normalizarTexto } from '../utils/texto.js';
import EditorOcultable from './EditorOcultable.jsx';
import '../styles/SidebarTerciario.css';

const CATEGORIAS = [
  { id: 'pleno', label: 'Pleno' },
  { id: 'direcciones', label: 'Direcciones generales' },
  { id: 'comisiones', label: 'Comisiones' }
];

const REMITENTES_POR_CATEGORIA = {
  pleno: ['Pleno'],
  direcciones: ['DGEJ', 'DEGETD', 'DGTI', 'DGJJ', 'DGIPDI', 'DGRH'],
  comisiones: ['Administración', 'Creación de nuevos órganos', 'Adscripción', 'Carrera judicial', 'Presupuesto']
};

const TODAS_DEPENDENCIAS = [
  { id: 'Pleno', categoria: 'pleno' },
  { id: 'DGEJ', categoria: 'direcciones' }, { id: 'DEGETD', categoria: 'direcciones' },
  { id: 'DGTI', categoria: 'direcciones' }, { id: 'DGJJ', categoria: 'direcciones' },
  { id: 'DGIPDI', categoria: 'direcciones' }, { id: 'DGRH', categoria: 'direcciones' },
  { id: 'Administración', categoria: 'comisiones' }, { id: 'Creación de nuevos órganos', categoria: 'comisiones' },
  { id: 'Adscripción', categoria: 'comisiones' }, { id: 'Carrera judicial', categoria: 'comisiones' },
  { id: 'Presupuesto', categoria: 'comisiones' }
];

const estadoVacio = {
  categoria: 'pleno',
  remitente: 'Pleno',
  contenido: '',
  tipoVotacion: 'Económica',
  acuerdo: '',
  archivos: []
};

function DropdownSelect({ valorActual, etiquetaActual, opciones, onSeleccionar }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const botonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function manejarClickFuera(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        botonRef.current && !botonRef.current.contains(e.target)
      ) setAbierto(false);
    }
    document.addEventListener('mousedown', manejarClickFuera);
    return () => document.removeEventListener('mousedown', manejarClickFuera);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    function cerrarPorScrollOResize(e) {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setAbierto(false);
    }
    window.addEventListener('scroll', cerrarPorScrollOResize, true);
    window.addEventListener('resize', cerrarPorScrollOResize);
    return () => {
      window.removeEventListener('scroll', cerrarPorScrollOResize, true);
      window.removeEventListener('resize', cerrarPorScrollOResize);
    };
  }, [abierto]);

  function toggle() {
    if (!abierto && botonRef.current) {
      const rect = botonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setAbierto(v => !v);
  }

  return (
    <>
      <div
        ref={botonRef}
        className={'ter-select dropdown-toggle' + (abierto ? ' abierto' : '')}
        onClick={toggle}
      >
        {etiquetaActual}
        <span className="dropdown-chevron">▾</span>
      </div>
      {abierto && (
        <div
          ref={menuRef}
          className="dropdown-menu"
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          {opciones.map(op => (
            <div
              key={op.id}
              className={'dropdown-item' + (op.id === valorActual ? ' activo' : '')}
              onClick={() => { onSeleccionar(op.id); setAbierto(false); }}
            >
              {op.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function SidebarTerciario() {
  const { sidebarTerciarioAbierto, setSidebarTerciarioAbierto, vistaActual } = useUI();
  const { secciones, seccionActual, puntoEditandoId, setPuntoEditandoId, agregarPunto, editarPuntoExistente, setPuntoSeleccionadoId, proyectoMeta, setOneDriveFolder } = useProyecto();
  const { obtenerAccessToken } = useAuth();
  const [form, setForm] = useState(estadoVacio);
  const [oneDriveStatus, setOneDriveStatus] = useState('');

  useEffect(() => {
    if (!sidebarTerciarioAbierto) return;
    if (puntoEditandoId) {
      const sec = secciones.find(s => s.id === puntoEditandoId);
      if (!sec) return;
      const dep = sec.dependencia || 'Pleno';
      const categoria = TODAS_DEPENDENCIAS.find(d => d.id === dep)?.categoria || 'pleno';
      setForm({
        categoria,
        remitente: dep,
        contenido: sec.contenido || '',
        tipoVotacion: sec.tipoVotacion || 'Económica',
        acuerdo: sec.acuerdo || 'Se aprueba por unanimidad',
        archivos: sec.archivos ? [...sec.archivos] : []
      });
    } else {
      setForm(estadoVacio);
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
    if (sidebarTerciarioAbierto && (seccionActual === 'aprobaciones' || seccionActual === 'asuntos generales')) {
      setSidebarTerciarioAbierto(false);
      setPuntoEditandoId(null);
    }
  }, [seccionActual]);

  if (!sidebarTerciarioAbierto) {
    return <aside className="sidebar-terciario hidden" id="sidebarTerciario"></aside>;
  }

  const opcionesRemitente = (REMITENTES_POR_CATEGORIA[form.categoria] || ['Pleno']).map(id => ({ id, label: id }));
  const categoriaActual = CATEGORIAS.find(c => c.id === form.categoria) || CATEGORIAS[0];

  function cambiarCategoria(categoria) {
    const opciones = REMITENTES_POR_CATEGORIA[categoria] || ['Pleno'];
    setForm(f => ({ ...f, categoria, remitente: opciones[0] }));
  }

function esArchivoWord(file) {
  return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         /\.docx$/i.test(file.name);
}
function esLineaTitulo(linea) {
  return /^[A-ZÁÉÍÓÚÑ\s]{4,}:?\s*$/.test(linea) && linea === linea.toUpperCase();
}

function extraerSeccionPorTitulo(textoCompleto, patronTitulo, patronTituloConTexto, cortarEnBlanco, separador) {
  const lineas = textoCompleto.split('\n').map(l => l.trim());

  let idxTitulo = -1;
  let textoEnMismaLinea = '';

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) continue;
    const matchConTexto = linea.match(patronTituloConTexto);
    if (matchConTexto) {
      idxTitulo = i;
      textoEnMismaLinea = matchConTexto[2].trim();
      break;
    }
    if (patronTitulo.test(linea)) {
      idxTitulo = i;
      break;
    }
  }

  if (idxTitulo === -1) return '';

  const parrafos = [];
  if (textoEnMismaLinea) parrafos.push(textoEnMismaLinea);

  let actual = [];
  for (let i = idxTitulo + 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) {
      if (actual.length > 0) { parrafos.push(actual.join(' ')); actual = []; }
      if (cortarEnBlanco && parrafos.length > 0) break;
      continue;
    }
    if (esLineaTitulo(linea) && (parrafos.length > 0 || actual.length > 0)) break;
    actual.push(linea);
  }
  if (actual.length > 0) parrafos.push(actual.join(' '));

  return parrafos.join(separador).trim();
}

function extraerParrafoAcuerdo(textoCompleto) {
  return extraerSeccionPorTitulo(
    textoCompleto,
    /^(PUNTO\s+DE\s+ACUERDO|ACUERDO)\s*:?\s*$/i,
    /^(PUNTO\s+DE\s+ACUERDO|ACUERDO)\s*:\s*(.+)$/i,
    true,
    ' '
  );
}

function extraerTextoAcuerdos(textoCompleto) {
  return extraerSeccionPorTitulo(
    textoCompleto,
    /^ACUERDOS\s*:?\s*$/i,
    /^ACUERDOS\s*:\s*(.+)$/i,
    false,
    '\n\n'
  );
}

async function extraerTextoWord(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const resultado = await mammoth.extractRawText({ arrayBuffer });
    const texto = resultado.value || '';
    const puntoAcuerdo = normalizarTexto(extraerParrafoAcuerdo(texto));
    const acuerdos = extraerTextoAcuerdos(texto);
    return { puntoAcuerdo, acuerdos };
  } catch (err) {
    console.error('Error al extraer texto del Word:', err);
    return { puntoAcuerdo: '', acuerdos: '' };
  }
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
      procesos.push(
        guardarArchivo(id, file).then(() => ({ id, nombre: file.name, tipo: file.type, _file: file }))
      );
    }
    if (procesos.length === 0) return;
    Promise.all(procesos).then(async (resultados) => {
      setForm(f => ({ ...f, archivos: [...f.archivos, ...resultados.map(({ _file, ...r }) => r)] }));
      e.target.value = '';

      const wordFile = resultados.find(r => esArchivoWord(r._file));
        if (!wordFile) return;
        if (form.contenido.trim() !== '' || form.acuerdo.trim() !== '') {
          if (!confirm('Se detectó un documento Word. ¿Extraer el punto de acuerdo y los acuerdos, reemplazando el contenido actual?')) return;
        }
        const { puntoAcuerdo, acuerdos } = await extraerTextoWord(wordFile._file);
        if (puntoAcuerdo || acuerdos) {
          setForm(f => ({
            ...f,
            contenido: puntoAcuerdo || f.contenido,
            acuerdo: acuerdos || f.acuerdo
          }));
        } else {
          alert('No se encontró un párrafo "ACUERDO" ni una sección "ACUERDOS" en el documento.');
        }
    }).catch(err => alert('Error al guardar archivos: ' + err.message));
  }

  function eliminarArchivoTemporal(idx) {
    setForm(f => ({ ...f, archivos: f.archivos.filter((_, i) => i !== idx) }));
  }

  function cerrar() {
    setPuntoEditandoId(null);
    setSidebarTerciarioAbierto(false);
  }

  function confirmar() {
    const contenido = form.contenido.trim() || 'Sin resumen';
    if (puntoEditandoId) {
      editarPuntoExistente(puntoEditandoId, {
        contenido,
        dependencia: form.remitente,
        tipoVotacion: form.tipoVotacion,
        acuerdo: form.acuerdo,
        archivos: form.archivos
      });
      setPuntoSeleccionadoId(puntoEditandoId);
      setPuntoEditandoId(null);
      setForm(estadoVacio);
      setSidebarTerciarioAbierto(false);
      return;
    }
    const nuevoId = agregarPunto({
      contenido,
      dependencia: form.remitente,
      seccion: seccionActual,
      tipoVotacion: form.tipoVotacion,
      acuerdo: form.acuerdo,
      archivos: form.archivos
    });
    setPuntoSeleccionadoId(nuevoId);
    if (form.archivos.length > 0) {
      subirArchivosAOneDrive(nuevoId, form.archivos);
    }
    setForm(f => ({ ...f, contenido: '', acuerdo: '', archivos: [] }));
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
    <aside className="sidebar-terciario" id="sidebarTerciario">
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
        <div className="ter-field">
          <input type="file" id="archivosInput" multiple style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', fontSize: '12px' }} onChange={adjuntarArchivos} />
          <div id="listaArchivosTemporales" style={{ marginTop: '6px', fontSize: '12px', color: '#555', maxHeight: '60px', overflowY: 'auto' }}>
            {form.archivos.length === 0
              ? <span style={{ color: '#aaa' }}>Ningún archivo adjunto</span>
              : form.archivos.map((a, idx) => (
                <span key={idx} className="archivo-item-temp">
                  {a.nombre} <span className="eliminar-archivo-temp" onClick={() => eliminarArchivoTemporal(idx)}>✕</span>
                </span>
              ))}
          </div>
          <div id="oneDriveStatus" className="onedrive-status">{oneDriveStatus}</div>
        </div>
        <div className="ter-field ter-field-grow">
          <EditorOcultable
            id="cuerpoTextarea"
            value={form.contenido}
            onChange={(v) => setForm(f => ({ ...f, contenido: v }))}
            placeholder="Punto de acuerdo"
          />
        </div>
        <div className="ter-field">
          <label className="ter-label">Tipo de votación</label>
          <select id="tipoVotacionSelect" className="ter-select" value={form.tipoVotacion} onChange={(e) => setForm(f => ({ ...f, tipoVotacion: e.target.value }))}>
            <option value="Económica">Económica</option>
            <option value="Nominal">Nominal</option>
            <option value="Cédula">Cédula</option>
          </select>
        </div>
        <div className="ter-field">
          <label className="ter-label">Acuerdo</label>
          <EditorOcultable
            id="acuerdoSelect"
            value={form.acuerdo}
            onChange={(v) => setForm(f => ({ ...f, acuerdo: v }))}
            placeholder="Acuerdos"
          />
        </div>

        <div className="ter-acciones">
          <button className="btn-cancel" id="btnCancelarCreacion" onClick={cerrar}>Cancelar</button>
          <button className="btn-confirm" id="btnConfirmarCreacion" onClick={confirmar}>{puntoEditandoId ? 'Guardar cambios' : 'Añadir'}</button>
        </div>
      </div>
    </aside>
  );
}