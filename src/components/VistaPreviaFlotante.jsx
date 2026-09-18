import { useEffect, useState } from 'react';
import { renderConOcultos, capitalizarPalabras } from '../utils/texto.js';
import { INTRO_ACTA_NOMBRE, INTRO_ACTA_RESTO, PUENTE_ACTA_TEXTO } from '../utils/textosActa.js';
import { PLANTILLAS, PLANTILLA_POR_DEFECTO, SECCIONES_POR_DEFECTO, crearBloquesPorDefecto } from '../utils/plantillasActa.js';
import EditorOcultable from './EditorOcultable.jsx';

const TIPOS_BLOQUE = [
  { id: 'considerando', label: 'Considerando', titulo: 'CONSIDERANDO', placeholder: 'Considerandos...', icon: 'fa-scale-balanced' },
  { id: 'antecedente', label: 'Antecedente', titulo: 'ANTECEDENTES', placeholder: 'Antecedentes...', icon: 'fa-clock-rotate-left' },
  { id: 'personalizada', label: 'Personalizada...', titulo: null, placeholder: 'Escribe el contenido...', icon: 'fa-pen' }
];
const PLACEHOLDER_SECCION = { id: '', label: 'Seleccionar sección...', icon: 'fa-list' };

// Tipos de sección que puede ofrecer el selector dado el estado actual de
// bloques: considerando/antecedente desaparecen en cuanto ya están
// agregados. Si no queda ninguno fijo libre, "Personalizada..." quedaría
// como única opción y el selector la marcaría sola (abriendo de una el
// campo de título sin que el usuario lo pidiera), así que en ese caso se
// antepone un placeholder neutro que hay que cambiar a propósito.
function tiposDisponiblesPara(bloques) {
  const fijosLibres = TIPOS_BLOQUE.filter(t => t.id !== 'personalizada' && !bloques.some(b => b.tipo === t.id));
  const personalizada = TIPOS_BLOQUE.find(t => t.id === 'personalizada');
  return fijosLibres.length > 0 ? [...fijosLibres, personalizada] : [PLACEHOLDER_SECCION, personalizada];
}

const TABLA_MAX_FILAS = 8;
const TABLA_MAX_COLS = 10;

export default function VistaPreviaFlotante({ form, setForm, visible, anclaRef, soloLectura, codigoLectura, remitenteLectura, onCerrarLectura }) {
  const [pos, setPos] = useState(null);
  const plantilla = form.plantilla || PLANTILLA_POR_DEFECTO;
  const setPlantilla = (id) => setForm(f => ({ ...f, plantilla: id }));
  const [tipoNuevoBloque, setTipoNuevoBloque] = useState(TIPOS_BLOQUE[0].id);
  const [tituloPersonalizado, setTituloPersonalizado] = useState('');
  const bloques = form.bloquesActa || [];
  const [selectorTablaAbierto, setSelectorTablaAbierto] = useState(false);
  const [tablaHover, setTablaHover] = useState({ filas: 0, cols: 0 });
  const [rangoGuardado, setRangoGuardado] = useState(null);
  const [dropdownAbierto, setDropdownAbierto] = useState(null);

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

  // Precarga las secciones por defecto de la plantilla: al montar (punto
  // nuevo) y cada vez que se cambia de plantilla, siempre que las secciones
  // actuales sigan "vírgenes" (vacías y no personalizadas) para no pisar
  // contenido que el usuario ya haya escrito. Si el usuario borra una
  // sección a mano no se vuelve a agregar (solo se reevalúa al cambiar de
  // plantilla, no en cada edición).
  useEffect(() => {
    const tipos = SECCIONES_POR_DEFECTO[plantilla];
    if (!tipos) return;
    const puedeReemplazar = bloques.every(b => b.tipo !== 'personalizada' && !(b.texto && b.texto.trim()));
    if (!puedeReemplazar) return;
    const actuales = bloques.map(b => b.tipo).join(',');
    if (actuales === tipos.join(',')) return;
    setForm(f => ({ ...f, bloquesActa: crearBloquesPorDefecto(plantilla) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantilla]);

  // El tipo de sección seleccionado en el selector no puede ser uno que ya
  // esté agregado (considerando/antecedente son únicos); si deja de estar
  // disponible, cae al primero que sí lo esté.
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
  function cambiarTamanoFuente(delta) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let elemento = range.commonAncestorContainer;
    if (elemento.nodeType === Node.TEXT_NODE) elemento = elemento.parentElement;
    // Extraer y reinsertar contenido dentro de una celda (range.extractContents
    // sobre una selección que toca estructura de tabla) puede romper filas/columnas,
    // así que esta función queda deshabilitada mientras la selección esté en una tabla.
    if (elemento.closest('table')) return;
    const tamanoActual = parseFloat(window.getComputedStyle(elemento).fontSize) || 13;
    const nuevoTamano = Math.min(72, Math.max(8, Math.round(tamanoActual + delta)));
    const span = document.createElement('span');
    span.style.fontSize = `${nuevoTamano}px`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    const nuevoRange = document.createRange();
    nuevoRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(nuevoRange);
    span.closest('[contenteditable]')?.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function aumentarFuente() {
    cambiarTamanoFuente(2);
  }
  function disminuirFuente() {
    cambiarTamanoFuente(-2);
  }
  function alinearIzquierda() {
    document.execCommand('justifyLeft');
  }
  function alinearCentro() {
    document.execCommand('justifyCenter');
  }
  function alinearDerecha() {
    document.execCommand('justifyRight');
  }
  function deshacer() {
    document.execCommand('undo');
  }
  function rehacer() {
    document.execCommand('redo');
  }
  function abrirSelectorTabla() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setRangoGuardado(sel.getRangeAt(0).cloneRange());
    }
    setTablaHover({ filas: 0, cols: 0 });
    setSelectorTablaAbierto(true);
  }
  function insertarTabla(filas, cols) {
    if (rangoGuardado) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(rangoGuardado);
    }
    let filasHtml = '';
    for (let f = 0; f < filas; f++) {
      let celdasHtml = '';
      for (let c = 0; c < cols; c++) {
        celdasHtml += f === 0
          ? '<th style="border:1px solid #999;padding:1px 2px;background:#d9d9d9;font-weight:700;">&nbsp;</th>'
          : '<td style="border:1px solid #999;padding:1px 2px;">&nbsp;</td>';
      }
      filasHtml += `<tr>${celdasHtml}</tr>`;
    }
    const tablaHtml = `<table style="border-collapse:collapse;width:100%;margin:10px 0;">${filasHtml}</table><p><br></p>`;
    document.execCommand('insertHTML', false, tablaHtml);
    setSelectorTablaAbierto(false);
    setRangoGuardado(null);
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
            <button type="button" className="btn-close-derecho" title="Cerrar vista previa" onClick={onCerrarLectura}>✕</button>
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
          {/* Selector de secciones: visible para ambas plantillas */}
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
          <span className="vp-header-sep"></span>
          {/* Deshacer/rehacer y formato: siempre visibles, para cualquier plantilla */}
          <button type="button" className="vp-header-btn" title="Deshacer" onMouseDown={(e) => { e.preventDefault(); deshacer(); }}>
            <i className="fas fa-undo"></i>
          </button>
          <button type="button" className="vp-header-btn" title="Rehacer" onMouseDown={(e) => { e.preventDefault(); rehacer(); }}>
            <i className="fas fa-redo"></i>
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
            <div style={{ textAlign: 'justify', marginBottom: '20px' }}>
              <strong>{INTRO_ACTA_NOMBRE}</strong>{INTRO_ACTA_RESTO}
            </div>
          )}
          {/* Mismo componente y mismas reglas (negritaTotal/modoAcuerdo) que
              el sidebar terciario: editar aquí o allá debe dar el mismo
              resultado en lugar de dos formas distintas de normalizar el
              texto que terminaban pisándose entre sí. */}
          {plantilla === 'proyecto' && (
            <EditorOcultable
              value={form.contenido}
              onChange={(v) => setForm(f => ({ ...f, contenido: v }))}
              placeholder="Punto de acuerdo..."
              negritaTotal
              className="vp-contenido"
              style={{ marginBottom: '20px', outline: 'none' }}
              soloLectura={soloLectura}
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
                />
              </div>
            );
          })}
          {plantilla === 'introduccion' && (
            <>
              <div style={{ textAlign: 'justify', margin: '10px 0' }}>{PUENTE_ACTA_TEXTO}</div>
              <EditorOcultable
                value={form.contenido}
                onChange={(v) => setForm(f => ({ ...f, contenido: v }))}
                placeholder="Punto de acuerdo..."
                negritaTotal
                className="vp-contenido"
                style={{ marginBottom: '20px', outline: 'none' }}
                soloLectura={soloLectura}
              />
            </>
          )}
          <EditorOcultable
            value={form.acuerdo}
            onChange={(v) => setForm(f => ({ ...f, acuerdo: v }))}
            placeholder="Acuerdos..."
            modoAcuerdo
            className=""
            style={{ outline: 'none' }}
            soloLectura={soloLectura}
          />
        </div>
      </div>
    </div>
  );
}