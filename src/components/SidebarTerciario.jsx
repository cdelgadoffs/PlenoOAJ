import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatearFechaES } from '../utils/fechas.js';
import { crearCarpetaProyecto, crearCarpetaPunto, subirArchivoAOneDrive } from '../services/onedrive.js';
import { guardarArchivo, obtenerArchivo, eliminarArchivo } from '../utils/archivosDB.js';
import mammoth from 'mammoth';
import { normalizarTexto } from '../utils/texto.js';

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

export default function SidebarTerciario() {
  const { sidebarTerciarioAbierto, setSidebarTerciarioAbierto } = useUI();
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

  if (!sidebarTerciarioAbierto) {
    return <aside className="sidebar-terciario hidden" id="sidebarTerciario"></aside>;
  }

  const opcionesRemitente = REMITENTES_POR_CATEGORIA[form.categoria] || ['Pleno'];

  function cambiarCategoria(categoria) {
    const opciones = REMITENTES_POR_CATEGORIA[categoria] || ['Pleno'];
    setForm(f => ({ ...f, categoria, remitente: opciones[0] }));
  }

function esArchivoWord(file) {
  return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         /\.docx$/i.test(file.name);
}
function extraerParrafoAcuerdo(textoCompleto) {
  const parrafos = textoCompleto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const idxAcuerdo = parrafos.findIndex(p => /^ACUERDO\b/i.test(p));
  if (idxAcuerdo === -1) return '';
  return parrafos[idxAcuerdo].replace(/^ACUERDO\s*:?\s*/i, '').trim();
}

async function extraerTextoWord(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const resultado = await mammoth.extractRawText({ arrayBuffer });
    const parrafo = extraerParrafoAcuerdo(resultado.value || '');
    return normalizarTexto(parrafo);
  } catch (err) {
    console.error('Error al extraer texto del Word:', err);
    return '';
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
        if (form.contenido.trim() !== '') {
          if (!confirm('Se detectó un documento Word. ¿Extraer el punto de acuerdo y reemplazar el contenido actual?')) return;
        }
        const texto = await extraerTextoWord(wordFile._file);
        if (texto) {
          setForm(f => ({ ...f, contenido: texto }));
        } else {
          alert('No se encontró un párrafo "ACUERDO" en el documento.');
        }
    }).catch(err => alert('Error al guardar archivos: ' + err.message));
  }

  function eliminarArchivoTemporal(idx) {
    setForm(f => {
      const archivo = f.archivos[idx];
      if (archivo) eliminarArchivo(archivo.id).catch(() => {});
      return { ...f, archivos: f.archivos.filter((_, i) => i !== idx) };
    });
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
    setForm(f => ({ ...f, contenido: '', archivos: [] }));
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
      <div className="ter-form">
        <div className="ter-field" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: '1' }}>
            <label className="ter-label">Categoría</label>
            <select id="filtroDependencia" className="ter-select" value={form.categoria} onChange={(e) => cambiarCategoria(e.target.value)}>
              <option value="pleno">Pleno</option>
              <option value="direcciones">Direcciones generales</option>
              <option value="comisiones">Comisiones</option>
            </select>
          </div>
          <div style={{ flex: '1' }}>
            <label className="ter-label">Remitente</label>
            <select id="remitenteSelect" className="ter-select" value={form.remitente} onChange={(e) => setForm(f => ({ ...f, remitente: e.target.value }))}>
              {opcionesRemitente.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
        </div>
        <div className="ter-field ter-field-grow">
          <textarea
            id="cuerpoTextarea"
            className="ter-textarea"
            placeholder="Punto de acuerdo"
            value={form.contenido}
            onChange={(e) => setForm(f => ({ ...f, contenido: e.target.value }))}
          ></textarea>
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
          <textarea
            id="acuerdoSelect"
            className="ter-textarea"
            placeholder=""
            value={form.acuerdo}
            onChange={(e) => setForm(f => ({ ...f, acuerdo: e.target.value }))}
          ></textarea>
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
        <div className="ter-acciones">
          <button className="btn-cancel" id="btnCancelarCreacion" onClick={cerrar}>Cancelar</button>
          <button className="btn-confirm" id="btnConfirmarCreacion" onClick={confirmar}>{puntoEditandoId ? 'Guardar cambios' : 'Añadir'}</button>
        </div>
      </div>
    </aside>
  );
}
