import { useEffect, useState } from 'react';
import { renderConOcultos, markersAHtml, nodoAMarkers, capitalizarPalabras } from '../utils/texto.js';
import EditorOcultable from './EditorOcultable.jsx';

const TIPOS_BLOQUE = [
  { id: 'considerando', label: 'Considerando', titulo: 'CONSIDERANDO', placeholder: 'Considerandos...' },
  { id: 'antecedente', label: 'Antecedente', titulo: 'ANTECEDENTES', placeholder: 'Antecedentes...' },
  { id: 'personalizada', label: 'Personalizada...', titulo: null, placeholder: 'Escribe el contenido...' }
];

export default function VistaPreviaFlotante({ form, setForm, visible, anclaRef }) {
  const [pos, setPos] = useState(null);
  const [tipoNuevoBloque, setTipoNuevoBloque] = useState(TIPOS_BLOQUE[0].id);
  const [tituloPersonalizado, setTituloPersonalizado] = useState('');

  useEffect(() => {
    if (!visible || !anclaRef.current) { setPos(null); return; }
    const elemento = anclaRef.current;
    function calcular() {
      const rect = elemento.getBoundingClientRect();
      setPos({ left: rect.right, top: rect.top });
    }
    calcular();
    window.addEventListener('resize', calcular);
    // El sidebar anima su ancho (transition: width), así que hay que
    // recalcular mientras dura la transición, no solo al montar.
    const observer = new ResizeObserver(calcular);
    observer.observe(elemento);
    return () => {
      window.removeEventListener('resize', calcular);
      observer.disconnect();
    };
  }, [visible, anclaRef]);

  if (!visible || !pos) return null;

  const bloques = form.bloquesActa || [];
  const esPersonalizada = tipoNuevoBloque === 'personalizada';

  function agregarBloque() {
    if (esPersonalizada) {
      const titulo = tituloPersonalizado.trim();
      if (!titulo) return;
      const nuevo = { id: 'blq_' + Date.now(), tipo: 'personalizada', titulo: titulo.toUpperCase(), texto: '' };
      setForm(f => ({ ...f, bloquesActa: [...(f.bloquesActa || []), nuevo] }));
      setTituloPersonalizado('');
      return;
    }
    const nuevo = { id: 'blq_' + Date.now(), tipo: tipoNuevoBloque, texto: '' };
    setForm(f => ({ ...f, bloquesActa: [...(f.bloquesActa || []), nuevo] }));
  }
  function actualizarBloque(id, texto) {
    setForm(f => ({ ...f, bloquesActa: (f.bloquesActa || []).map(b => b.id === id ? { ...b, texto } : b) }));
  }
  function eliminarBloque(id) {
    setForm(f => ({ ...f, bloquesActa: (f.bloquesActa || []).filter(b => b.id !== id) }));
  }

  // Los botones de formato viven fuera de los editores; con preventDefault en
  // mousedown se evita el blur, así el execCommand actúa sobre la selección
  // vigente del editor que estaba activo (Considerando, Antecedente, etc.).
  function aplicarNegrita() {
    document.execCommand('bold');
  }
  function aplicarItalica() {
    document.execCommand('italic');
  }
  function aplicarListaNumerada() {
    document.execCommand('insertOrderedList');
  }
  function capitalizarSeleccion() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const texto = sel.toString();
    if (!texto.trim()) return;
    document.execCommand('insertText', false, capitalizarPalabras(texto));
  }
  function deshacer() {
    document.execCommand('undo');
  }
  function rehacer() {
    document.execCommand('redo');
  }

  return (
    <div className="vista-previa-flotante" style={{ left: pos.left, top: pos.top, bottom: 0 }}>
      <div className="vista-previa-columna">
        <div className="vista-previa-header">
          <select
            className="vp-header-select"
            value={tipoNuevoBloque}
            onChange={e => setTipoNuevoBloque(e.target.value)}
          >
            {TIPOS_BLOQUE.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {esPersonalizada && (
            <input
              type="text"
              className="vp-header-input"
              value={tituloPersonalizado}
              onChange={e => setTituloPersonalizado(e.target.value)}
              placeholder="Título de la sección"
              onKeyDown={e => { if (e.key === 'Enter') agregarBloque(); }}
            />
          )}
          <button
            type="button"
            className="vp-header-btn"
            title="Añadir sección"
            onClick={agregarBloque}
            disabled={esPersonalizada && !tituloPersonalizado.trim()}
          >
            <i className="fas fa-plus"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Cargar plantilla (próximamente)" disabled>
            <i className="fas fa-file-import"></i>
          </button>
          <span className="vp-header-sep"></span>
          <button type="button" className="vp-header-btn" title="Deshacer" onMouseDown={(e) => { e.preventDefault(); deshacer(); }}>
            <i className="fas fa-undo"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Rehacer" onMouseDown={(e) => { e.preventDefault(); rehacer(); }}>
            <i className="fas fa-redo"></i>
          </button>
          <span className="vp-header-sep"></span>
          <button type="button" className="vp-header-btn" title="Negrita" onMouseDown={(e) => { e.preventDefault(); aplicarNegrita(); }}>
            <i className="fas fa-bold"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Itálica" onMouseDown={(e) => { e.preventDefault(); aplicarItalica(); }}>
            <i className="fas fa-italic"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Viñeta numérica" onMouseDown={(e) => { e.preventDefault(); aplicarListaNumerada(); }}>
            <i className="fas fa-list-ol"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Capitalizar selección" onMouseDown={(e) => { e.preventDefault(); capitalizarSeleccion(); }}>
            Aa
          </button>
        </div>
        <div className="vista-previa-hoja">
        <div style={{ textAlign: 'left', marginBottom: '10px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '100px', marginBottom: '0px' }} />

        </div>
        <div style={{ textAlign: 'justify', marginBottom: '20px' }}>
          <strong>El Pleno del Órgano de Administración Judicial del Poder Judicial de la Federación</strong>, con fundamento en los artículos 94, párrafo segundo, 100, párrafos décimo segundo, décimo tercero y décimo octavo de la Constitución Política de los Estados Unidos Mexicanos; así como 1, fracción VIII, 70, 71, 78, 79, primer párrafo, 80, fracción II de la Ley Orgánica del Poder Judicial de la Federación; y,
        </div>
        {bloques.map(bloque => {
          const tipoInfo = TIPOS_BLOQUE.find(t => t.id === bloque.tipo) || TIPOS_BLOQUE[0];
          const titulo = bloque.tipo === 'personalizada' ? (bloque.titulo || 'SECCIÓN') : tipoInfo.titulo;
          return (
            <div key={bloque.id} className="vp-bloque">
              <div className="vp-bloque-titulo">
                {titulo}
                <button type="button" className="vp-bloque-quitar" title="Quitar sección" onClick={() => eliminarBloque(bloque.id)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <EditorOcultable
                value={bloque.texto}
                onChange={(v) => actualizarBloque(bloque.id, v)}
                placeholder={tipoInfo.placeholder}
                modoConsiderando
                className=""
                style={{ outline: 'none' }}
              />
            </div>
          );
        })}
        <div
          contentEditable
          suppressContentEditableWarning
          className="vp-contenido"
          style={{ fontWeight: 700, marginBottom: '20px', outline: 'none' }}
          data-placeholder="Punto de acuerdo..."
          dangerouslySetInnerHTML={{ __html: markersAHtml(form.contenido) }}
          onBlur={e => {
            const nuevoContenido = nodoAMarkers(e.currentTarget);
            setForm(f => ({ ...f, contenido: nuevoContenido }));
          }}
        />
        <div
          contentEditable
          suppressContentEditableWarning
          style={{ outline: 'none' }}
          data-placeholder="Acuerdos..."
          dangerouslySetInnerHTML={{ __html: markersAHtml(form.acuerdo) }}
          onBlur={e => {
            const nuevoAcuerdo = nodoAMarkers(e.currentTarget);
            setForm(f => ({ ...f, acuerdo: nuevoAcuerdo }));
          }}
        />
        </div>
      </div>
    </div>
  );
}