import { useEffect, useRef, useState } from 'react';
import { renderConOcultos, capitalizarPalabras } from '../utils/texto.js';
import { PLANTILLAS, PLANTILLA_POR_DEFECTO, SECCIONES_POR_DEFECTO, crearBloquesPorDefecto } from '../utils/plantillasActa.js';
import { generarWordPunto } from '../utils/wordPunto.js';
import { generarTextoEngrose } from '../utils/textoEngrose.js';
import { useProyecto } from '../context/ProyectoContext.jsx';
import EditorOcultable from './EditorOcultable.jsx';

const TIPOS_BLOQUE = [
  { id: 'considerando', label: 'Considerando', titulo: 'CONSIDERANDO', placeholder: 'Considerandos...', icon: 'fa-scale-balanced' },
  { id: 'antecedente', label: 'Antecedente', titulo: 'ANTECEDENTES', placeholder: 'Antecedentes...', icon: 'fa-clock-rotate-left' },
  { id: 'personalizada', label: 'Personalizada...', titulo: null, placeholder: 'Escribe el contenido...', icon: 'fa-pen' }
];
const PLACEHOLDER_SECCION = { id: '', label: 'Seleccionar sección...', icon: 'fa-list' };

function tiposDisponiblesPara(bloques) {
  const fijosLibres = TIPOS_BLOQUE.filter(t => t.id !== 'personalizada' && !bloques.some(b => b.tipo === t.id));
  const personalizada = TIPOS_BLOQUE.find(t => t.id === 'personalizada');
  return fijosLibres.length > 0 ? [...fijosLibres, personalizada] : [PLACEHOLDER_SECCION, personalizada];
}

const TABLA_MAX_FILAS = 8;
const TABLA_MAX_COLS = 10;

export default function VistaPreviaFlotante({ form, setForm, visible, anclaRef, soloLectura, codigoLectura, remitenteLectura, onCerrarLectura, onAporte }) {
  const { proyectoMeta, asistentes, secretarioEjecutivo } = useProyecto();
  const [pos, setPos] = useState(null);
  const plantilla = form.plantilla || PLANTILLA_POR_DEFECTO;
  const setPlantilla = (id) => setForm(f => ({ ...f, plantilla: id }));
  const [tipoNuevoBloque, setTipoNuevoBloque] = useState(TIPOS_BLOQUE[0].id);
  const [tituloPersonalizado, setTituloPersonalizado] = useState('');
  const bloques = form.bloquesActa || [];
  const [selectorTablaAbierto, setSelectorTablaAbierto] = useState(false);
  const [tablaHover, setTablaHover] = useState({ filas: 0, cols: 0 });
  const [dropdownAbierto, setDropdownAbierto] = useState(null);
  const editorActivoRef = useRef(null);

  useEffect(() => {
    if (!visible || !anclaRef.current) { setPos(null); return; }
    const elemento = anclaRef.current;
    function calcular() {
      const rect = elemento.getBoundingClientRect();
      setPos({ left: rect.right, top: rect.top });
    }
    calcular();
    window.addEventListener('resize', calcular);

    const observer = new ResizeObserver(calcular);
    observer.observe(elemento);
    return () => {
      window.removeEventListener('resize', calcular);
      observer.disconnect();
    };
  }, [visible, anclaRef]);

  useEffect(() => {
    const tipos = SECCIONES_POR_DEFECTO[plantilla];
    if (!tipos) {
      if (bloques.length > 0) setForm(f => ({ ...f, bloquesActa: [] }));
      return;
    }
    const actuales = bloques.map(b => b.tipo).join(',');
    if (actuales === tipos.join(',')) return;

    const vacios = crearBloquesPorDefecto(plantilla);
    const ordenados = tipos.map(tipo => bloques.find(b => b.tipo === tipo) || vacios.find(b => b.tipo === tipo));
    const personalizadas = bloques.filter(b => b.tipo === 'personalizada');

    setForm(f => ({ ...f, bloquesActa: [...ordenados, ...personalizadas] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantilla]);

  useEffect(() => {
    const disponibles = tiposDisponiblesPara(bloques);
    if (!disponibles.some(t => t.id === tipoNuevoBloque)) {
      setTipoNuevoBloque(disponibles[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloques, tipoNuevoBloque]);

  useEffect(() => {
    if (!selectorTablaAbierto) return;
    function cerrar(e) {
      if (!e.target.closest('.vp-tabla-wrapper')) setSelectorTablaAbierto(false);
    }
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [selectorTablaAbierto]);

  useEffect(() => {
    if (!dropdownAbierto) return;
    function cerrar(e) {
      if (!e.target.closest('.vp-dropdown-wrapper')) setDropdownAbierto(null);
    }
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [dropdownAbierto]);

  if (!visible || !pos) return null;

  const esPersonalizada = tipoNuevoBloque === 'personalizada';
  const tiposDisponibles = tiposDisponiblesPara(bloques);
  const seccionActual = tiposDisponibles.find(t => t.id === tipoNuevoBloque) || PLACEHOLDER_SECCION;

  const engrose = generarTextoEngrose({ tipoVotacion: form.tipoVotacion, proyectoMeta, asistentes, secretarioEjecutivo });

  async function descargarWord() {
    const { blob, nombreArchivo } = await generarWordPunto(form, proyectoMeta, { engrose: soloLectura ? { asistentes, secretarioEjecutivo } : null });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = nombreArchivo;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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
    onAporte && onAporte();
    setForm(f => ({ ...f, bloquesActa: (f.bloquesActa || []).map(b => b.id === id ? { ...b, texto } : b) }));
  }
  function eliminarBloque(id) {
    setForm(f => ({ ...f, bloquesActa: (f.bloquesActa || []).filter(b => b.id !== id) }));
  }

  function editorActivo() {
    return editorActivoRef.current;
  }
  function aplicarNegrita() {
    editorActivo()?.chain().focus().toggleBold().run();
  }
  function aplicarItalica() {
    editorActivo()?.chain().focus().toggleItalic().run();
  }
  function aplicarListaNumerada() {
    editorActivo()?.chain().focus().toggleOrderedList().run();
  }
  async function copiarSeleccion() {
    const editor = editorActivo();
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const texto = from === to ? editor.getText() : editor.state.doc.textBetween(from, to, '\n');
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
    } catch (err) {
      console.error('No se pudo copiar al portapapeles:', err);
    }
  }
  async function pegarPortapapeles() {
    const editor = editorActivo();
    if (!editor) return;
    try {
      const texto = await navigator.clipboard.readText();
      if (texto) editor.chain().focus().insertContent(texto).run();
    } catch (err) {
      console.error('No se pudo pegar desde el portapapeles:', err);
    }
  }
  function capitalizarSeleccion() {
    const editor = editorActivo();
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const texto = editor.state.doc.textBetween(from, to, ' ');
    if (!texto.trim()) return;
    editor.chain().focus().insertContentAt({ from, to }, capitalizarPalabras(texto)).run();
  }
  function cambiarTamanoFuente(delta) {
    const editor = editorActivo();
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const actual = editor.getAttributes('fontSize').size;
    const tamanoActual = actual ? parseFloat(actual) : 13;
    const nuevoTamano = Math.min(72, Math.max(8, Math.round(tamanoActual + delta)));
    editor.chain().focus().setMark('fontSize', { size: `${nuevoTamano}px` }).run();
  }
  function aumentarFuente() {
    cambiarTamanoFuente(2);
  }
  function disminuirFuente() {
    cambiarTamanoFuente(-2);
  }
  function alinearIzquierda() {
    editorActivo()?.chain().focus().setTextAlign('left').run();
  }
  function alinearCentro() {
    editorActivo()?.chain().focus().setTextAlign('center').run();
  }
  function alinearDerecha() {
    editorActivo()?.chain().focus().setTextAlign('right').run();
  }
  function deshacer() {
    editorActivo()?.chain().focus().undo().run();
  }
  function rehacer() {
    editorActivo()?.chain().focus().redo().run();
  }
  function abrirSelectorTabla() {
    setTablaHover({ filas: 0, cols: 0 });
    setSelectorTablaAbierto(true);
  }
  function insertarTabla(filas, cols) {
    const editor = editorActivo();
    setSelectorTablaAbierto(false);
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: filas, cols, withHeaderRow: true }).run();
    const { state, view } = editor;
    const { $from } = state.selection;
    for (let d = $from.depth; d > 0; d--) {
      const nodo = $from.node(d);
      if (nodo.type.name !== 'table') continue;
      const inicio = $from.before(d);
      const tr = state.tr;
      state.doc.nodesBetween(inicio, inicio + nodo.nodeSize, (n, pos) => {
        if (n.type.name === 'paragraph') tr.setNodeMarkup(pos, undefined, { ...n.attrs, textAlign: 'center' });
      });
      view.dispatch(tr);
      break;
    }
  }

  return (
    <div className="vista-previa-flotante" style={{ left: pos.left, top: pos.top, bottom: 0 }}>
      <div className="vista-previa-columna">
        {soloLectura && (
          <div className="vista-previa-header vp-header-lectura">
            <div className="vp-lectura-info">
              {codigoLectura && <span className="vp-lectura-codigo">{codigoLectura}</span>}
              {remitenteLectura && <span className="vp-lectura-remitente">{remitenteLectura}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button type="button" className="vp-header-btn" title="Descargar Word" onClick={descargarWord}>
                <i className="fas fa-download"></i>
              </button>
              <button type="button" className="btn-close-derecho" title="Cerrar vista previa" onClick={onCerrarLectura}>✕</button>
            </div>
          </div>
        )}
        {!soloLectura && (
        <div className="vista-previa-header">
          <select
            className="vp-header-select"
            value={plantilla}
            onChange={e => setPlantilla(e.target.value)}
            title="Plantilla"
          >
            {PLANTILLAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {plantilla === 'personalizada' && (
            <>
              <div className="vp-dropdown-wrapper">
                <button
                  type="button"
                  className="vp-header-btn"
                  title={`Sección: ${seccionActual.label}`}
                  onClick={() => setDropdownAbierto(d => d === 'seccion' ? null : 'seccion')}
                >
                  <i className={`fas ${seccionActual.icon}`}></i>
                </button>
                {dropdownAbierto === 'seccion' && (
                  <div className="vp-dropdown-menu">
                    {tiposDisponibles.map(t => (
                      <button
                        type="button"
                        key={t.id}
                        className={`vp-dropdown-item${t.id === tipoNuevoBloque ? ' activo' : ''}`}
                        onClick={() => { setTipoNuevoBloque(t.id); setDropdownAbierto(null); }}
                      >
                        <i className={`fas ${t.icon}`}></i>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {esPersonalizada && (
                <input
                  type="text"
                  className="vp-header-input"
                  value={tituloPersonalizado}
                  onChange={e => setTituloPersonalizado(e.target.value)}
                  placeholder="Título de la sección"
                  onKeyDown={e => { if (e.key === 'Enter') agregarBloque(); }}
                  autoFocus
                />
              )}
              <button
                type="button"
                className="vp-header-btn"
                title="Añadir sección"
                onClick={agregarBloque}
                disabled={!tipoNuevoBloque || (esPersonalizada && !tituloPersonalizado.trim())}
              >
                <i className="fas fa-plus"></i>
              </button>
            </>
          )}
          <span className="vp-header-sep"></span>
          {/* Deshacer/rehacer y formato: siempre visibles, para cualquier plantilla */}
          <button type="button" className="vp-header-btn" title="Deshacer" onMouseDown={(e) => { e.preventDefault(); deshacer(); }}>
            <i className="fas fa-undo"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Rehacer" onMouseDown={(e) => { e.preventDefault(); rehacer(); }}>
            <i className="fas fa-redo"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Copiar (Ctrl+C)" onMouseDown={(e) => { e.preventDefault(); copiarSeleccion(); }}>
            <i className="fas fa-copy"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Pegar (Ctrl+V)" onMouseDown={(e) => { e.preventDefault(); pegarPortapapeles(); }}>
            <i className="fas fa-paste"></i>
          </button>
          <div className="vp-tabla-wrapper">
            <button
              type="button"
              className="vp-header-btn"
              title="Insertar tabla"
              onMouseDown={(e) => { e.preventDefault(); abrirSelectorTabla(); }}
            >
              <i className="fas fa-table"></i>
            </button>
            {selectorTablaAbierto && (
              <div className="vp-tabla-selector" onMouseLeave={() => setTablaHover({ filas: 0, cols: 0 })}>
                <div className="vp-tabla-grid">
                  {Array.from({ length: TABLA_MAX_FILAS }).map((_, f) => (
                    <div key={f} className="vp-tabla-fila">
                      {Array.from({ length: TABLA_MAX_COLS }).map((_, c) => (
                        <div
                          key={c}
                          className={`vp-tabla-celda ${f < tablaHover.filas && c < tablaHover.cols ? 'activa' : ''}`}
                          onMouseEnter={() => setTablaHover({ filas: f + 1, cols: c + 1 })}
                          onMouseDown={(e) => { e.preventDefault(); insertarTabla(f + 1, c + 1); }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="vp-tabla-etiqueta">
                  {tablaHover.filas > 0 ? `${tablaHover.filas} x ${tablaHover.cols}` : 'Selecciona tamaño'}
                </div>
              </div>
            )}
          </div>
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
          <button type="button" className="vp-header-btn" title="Aumentar tamaño de fuente" onMouseDown={(e) => { e.preventDefault(); aumentarFuente(); }}>
            A<sup>+</sup>
          </button>
          <button type="button" className="vp-header-btn" title="Disminuir tamaño de fuente" onMouseDown={(e) => { e.preventDefault(); disminuirFuente(); }}>
            A<sup>-</sup>
          </button>
          <span className="vp-header-sep"></span>
          <button type="button" className="vp-header-btn" title="Alinear izquierda" onMouseDown={(e) => { e.preventDefault(); alinearIzquierda(); }}>
            <i className="fas fa-align-left"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Centrar" onMouseDown={(e) => { e.preventDefault(); alinearCentro(); }}>
            <i className="fas fa-align-center"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Alinear derecha" onMouseDown={(e) => { e.preventDefault(); alinearDerecha(); }}>
            <i className="fas fa-align-right"></i>
          </button>
        </div>
        )}
        <div className="vista-previa-hoja">
          <div style={{ textAlign: 'left', marginBottom: '10px' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '100px', marginBottom: '0px' }} />
          </div>
          {plantilla === 'introduccion' && (
            <EditorOcultable
              value={form.introTexto}
              onChange={(v) => { onAporte && onAporte(); setForm(f => ({ ...f, introTexto: v })); }}
              placeholder="Fundamento..."
              className=""
              style={{ textAlign: 'justify', marginBottom: '20px', outline: 'none' }}
              soloLectura={soloLectura}
              onFocusEditor={(ed) => { editorActivoRef.current = ed; }}
            />
          )}

          {plantilla === 'proyecto' && (
            <EditorOcultable
              value={form.contenido}
              onChange={(v) => { onAporte && onAporte(); setForm(f => ({ ...f, contenido: v })); }}
              placeholder="Punto de acuerdo..."
              negritaTotal
              className="vp-contenido"
              style={{ marginBottom: '20px', outline: 'none' }}
              soloLectura={soloLectura}
              onFocusEditor={(ed) => { editorActivoRef.current = ed; }}
            />
          )}
          {bloques.map(bloque => {
            const tipoInfo = TIPOS_BLOQUE.find(t => t.id === bloque.tipo) || TIPOS_BLOQUE[0];
            const titulo = bloque.tipo === 'personalizada' ? (bloque.titulo || 'SECCIÓN') : tipoInfo.titulo;
            return (
              <div key={bloque.id} className="vp-bloque">
                <div className="vp-bloque-titulo">
                  {titulo}
                  {!soloLectura && (
                    <button type="button" className="vp-bloque-quitar" title="Quitar sección" onClick={() => eliminarBloque(bloque.id)}>
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
                <EditorOcultable
                  value={bloque.texto}
                  onChange={(v) => actualizarBloque(bloque.id, v)}
                  placeholder={tipoInfo.placeholder}
                  modoConsiderando
                  className=""
                  style={{ outline: 'none' }}
                  soloLectura={soloLectura}
                  onFocusEditor={(ed) => { editorActivoRef.current = ed; }}
                />
              </div>
            );
          })}
          {plantilla === 'introduccion' && (
            <>
              <EditorOcultable
                value={form.puenteTexto}
                onChange={(v) => { onAporte && onAporte(); setForm(f => ({ ...f, puenteTexto: v })); }}
                placeholder="Frase puente..."
                className=""
                style={{ textAlign: 'justify', margin: '10px 0', outline: 'none' }}
                soloLectura={soloLectura}
                onFocusEditor={(ed) => { editorActivoRef.current = ed; }}
              />
              <EditorOcultable
                value={form.contenido}
                onChange={(v) => { onAporte && onAporte(); setForm(f => ({ ...f, contenido: v })); }}
                placeholder="Punto de acuerdo..."
                negritaTotal
                className="vp-contenido"
                style={{ marginBottom: '20px', outline: 'none' }}
                soloLectura={soloLectura}
                onFocusEditor={(ed) => { editorActivoRef.current = ed; }}
              />
            </>
          )}
          {plantilla === 'personalizada' && (
            <EditorOcultable
              value={form.contenido}
              onChange={(v) => { onAporte && onAporte(); setForm(f => ({ ...f, contenido: v })); }}
              placeholder="Punto de acuerdo..."
              negritaTotal
              className="vp-contenido"
              style={{ marginBottom: '20px', outline: 'none' }}
              soloLectura={soloLectura}
              onFocusEditor={(ed) => { editorActivoRef.current = ed; }}
            />
          )}
          <div className="vp-bloque-titulo">ACUERDO</div>
          <EditorOcultable
            value={form.acuerdo}
            onChange={(v) => { onAporte && onAporte(); setForm(f => ({ ...f, acuerdo: v })); }}
            placeholder="Acuerdos..."
            modoAcuerdo
            className=""
            style={{ outline: 'none' }}
            soloLectura={soloLectura}
            onFocusEditor={(ed) => { editorActivoRef.current = ed; }}
          />
          {soloLectura && (
            <div className="vp-engrose">
              <div style={{ textAlign: 'justify' }}>{engrose.parrafo}</div>
              <div className="vp-engrose-firma">
                <div className="vp-engrose-linea"></div>
                <div className="vp-engrose-nombre">{engrose.firmaPresidente.nombre}</div>
                <div>{engrose.firmaPresidente.cargo1}</div>
                <div>{engrose.firmaPresidente.cargo2}</div>
              </div>
              <div className="vp-engrose-firma">
                <div className="vp-engrose-linea"></div>
                <div className="vp-engrose-nombre">{engrose.firmaSecretario.nombre}</div>
                <div>{engrose.firmaSecretario.cargo1}</div>
                <div>{engrose.firmaSecretario.cargo2}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}