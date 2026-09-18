import { useEffect, useRef, useState } from 'react';
import { agregarNombrePropio } from '../utils/diccionarioPropios.js';
import { aplicarPrefijosAcuerdo } from '../utils/ordinales.js';
import { markersAHtml, nodoAMarkers } from '../utils/texto.js';

export default function EditorOcultable({ id, value, onChange, placeholder, autoAjustar, negritaTotal, modoAcuerdo, modoConsiderando, className, style, soloLectura }) {
  const ref = useRef(null);
  const [botonPos, setBotonPos] = useState(null);
  const [textoSeleccionado, setTextoSeleccionado] = useState('');
  const ultimoValorExternoRef = useRef(value);

  useEffect(() => {
    if (!ref.current) return;
    if (value !== ultimoValorExternoRef.current && document.activeElement !== ref.current) {
      ref.current.innerHTML = markersAHtml(value);
    }
    ultimoValorExternoRef.current = value;
  }, [value]);

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML && value) {
      ref.current.innerHTML = markersAHtml(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sincronizar() {
    if (!ref.current) return;
    let markers = nodoAMarkers(ref.current);
    if (negritaTotal) {
      markers = markers.split('\n').map(linea => {
        if (linea.startsWith('##tabla##')) return linea;
        const alineada = linea.match(/^(##align-[a-z]+##)(.*)$/s);
        const prefijo = alineada ? alineada[1] : '';
        const cuerpo = alineada ? alineada[2] : linea;
        const plano = cuerpo.replace(/\*\*/g, '');
        return prefijo + (plano.trim() ? `**${plano}**` : plano);
      }).join('\n');
    }
    if (modoAcuerdo) {
      markers = aplicarPrefijosAcuerdo(markers);
    }
    if (modoConsiderando) {
      markers = aplicarPrefijosAcuerdo(markers, true);
    }
    ultimoValorExternoRef.current = markers;
    onChange(markers);
  }

  function manejarSeleccion() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setBotonPos(null);
      setTextoSeleccionado('');
      return;
    }
    const range = sel.getRangeAt(0);
    if (!ref.current || !ref.current.contains(range.commonAncestorContainer)) {
      setBotonPos(null);
      setTextoSeleccionado('');
      return;
    }
    const rect = range.getBoundingClientRect();
    const contenedorRect = ref.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { setBotonPos(null); return; }
    setTextoSeleccionado(sel.toString());
    setBotonPos({
      top: rect.top - contenedorRect.top - 34,
      left: rect.right - contenedorRect.left
    });
  }

  function ocultarSeleccion() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'marca-oculta';
    span.appendChild(range.extractContents());
    range.insertNode(span);
    sel.removeAllRanges();
    sincronizar();
    setBotonPos(null);
  }

  function agregarADiccionario() {
    const texto = textoSeleccionado.trim();
    if (!texto) return;
    const resultado = agregarNombrePropio(texto);
    if (resultado.ok) {
      alert(`"${texto}" se agregó al diccionario de nombres propios.`);
    } else if (resultado.motivo === 'duplicado') {
      alert(`"${texto}" ya está en el diccionario.`);
    }
    setBotonPos(null);
  }

  return (
    <div style={{ position: 'relative' }}>
      {!soloLectura && botonPos && (
        <div
          style={{ position: 'absolute', top: botonPos.top, center: botonPos.left, display: 'flex', gap: '4px' }}
        >
          <button
            type="button"
            className="btn-ocultar-flotante"
            title="Ocultar selección"
            onMouseDown={(e) => { e.preventDefault(); ocultarSeleccion(); }}
          >
            <i className="fas fa-eye-slash"></i>
          </button>
          <button
            type="button"
            className="btn-ocultar-flotante"
            title="Añadir al diccionario"
            onMouseDown={(e) => { e.preventDefault(); agregarADiccionario(); }}
          >
            <i className="fas fa-book"></i>
          </button>
        </div>
      )}
      <div
        id={id}
        ref={ref}
        className={className ?? ('ter-textarea ter-textarea-editable' + (autoAjustar ? ' ter-textarea-auto' : ''))}
        style={{ ...(negritaTotal ? { fontWeight: 700 } : null), ...style }}
        contentEditable={!soloLectura}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={soloLectura ? undefined : sincronizar}
        onMouseUp={soloLectura ? undefined : manejarSeleccion}
        onKeyUp={soloLectura ? undefined : manejarSeleccion}
        onBlur={soloLectura ? undefined : () => {
          setBotonPos(null);
          if (ref.current) {
            ref.current.innerHTML = markersAHtml(ultimoValorExternoRef.current);
          }
        }}
        onPaste={soloLectura ? undefined : manejarPegado}
      ></div>
    </div>
  );
}

function manejarPegado(e) {
  e.preventDefault();
  const texto = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, texto);
}