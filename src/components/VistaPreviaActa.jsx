import { useMemo, useState } from 'react';
import { useProyecto } from '../context/ProyectoContext.jsx';
import EditorOcultable from './EditorOcultable.jsx';
import { construirBloquesActa, textoDeBloque, generarWordActa, generarWordActaPublica, descargarBlobActa } from '../utils/wordActa.js';
import '../styles/VistaPreviaFlotante.css';

export default function VistaPreviaActa() {
  const { secciones, sesiones, sesionActivaFecha, proyectoMeta, asistentes, actualizarActaOverride } = useProyecto();
  const [editando, setEditando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [generandoPublica, setGenerandoPublica] = useState(false);

  const sesionActiva = (sesionActivaFecha ? sesiones[sesionActivaFecha] : null) || {};
  const overrides = sesionActiva.actaOverrides || {};

  const bloques = useMemo(
    () => construirBloquesActa(secciones, proyectoMeta, asistentes, sesionActiva),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [secciones, proyectoMeta, asistentes, sesionActiva.horaInicio, sesionActiva.horaFin]
  );
  const hayEdiciones = Object.keys(overrides).length > 0;

  function solicitarEdicion() {
    const ok = confirm(
      '¿Deseas editar el acta de esta sesión?\n\nLos cambios se guardan de inmediato y esa siempre será la versión que se descargue, para los bloques que edites.'
    );
    if (!ok) return;
    setEditando(true);
  }

  async function descargar() {
    setGenerando(true);
    try {
      descargarBlobActa(await generarWordActa(secciones, proyectoMeta, asistentes, sesionActiva));
    } catch (err) {
      alert('No se pudo generar el acta: ' + err.message);
    } finally {
      setGenerando(false);
    }
  }

  async function descargarPublica() {
    setGenerandoPublica(true);
    try {
      descargarBlobActa(await generarWordActaPublica(secciones, proyectoMeta, asistentes, sesionActiva));
    } catch (err) {
      alert('No se pudo generar el acta pública: ' + err.message);
    } finally {
      setGenerandoPublica(false);
    }
  }

  if (bloques.length === 0) {
    return (
      <div className="placeholder-msg" style={{ marginTop: '40px' }}>
        <strong>No hay puntos para mostrar el acta</strong>
      </div>
    );
  }

  return (
    <div className="vista-previa-columna" style={{ maxWidth: 'none' }}>
      <div className="vista-previa-header vp-header-lectura">
        <div className="vp-lectura-info">
          <span className="vp-lectura-codigo">Acta de la sesión</span>
          {hayEdiciones && <span className="vp-lectura-remitente">Editada manualmente</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!editando && (
            <button type="button" className="vp-header-btn" title="Editar acta" onClick={solicitarEdicion}>
              <i className="fas fa-pen"></i>
            </button>
          )}
          {editando && (
            <button type="button" className="vp-header-btn" title="Terminar edición" onClick={() => setEditando(false)}>
              <i className="fas fa-check"></i>
            </button>
          )}
          <button type="button" className="vp-header-btn" title="Descargar Word" disabled={generando} onClick={descargar}>
            <i className="fas fa-download"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Descargar acta pública" disabled={generandoPublica} onClick={descargarPublica}>
            <i className="fas fa-eye-slash"></i>
          </button>
        </div>
      </div>
      <div className="vista-previa-hoja" style={{ maxWidth: 'none' }}>
        {bloques.map(bloque => (
          <div key={bloque.key} style={{ marginBottom: '14px' }}>
            {bloque.identificador && (
              <span style={{ fontWeight: 700 }}>{bloque.identificador}</span>
            )}
            <EditorOcultable
              value={textoDeBloque(bloque, overrides)}
              onChange={(v) => actualizarActaOverride(sesionActivaFecha, bloque.key, v)}
              soloLectura={!editando}
              modoAcuerdo={bloque.tipo === 'acuerdo'}
              negritaTotal={bloque.tipo === 'confidencial'}
              style={{ textAlign: 'justify', outline: 'none' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
