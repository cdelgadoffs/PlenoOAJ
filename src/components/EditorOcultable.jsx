import { useEffect, useRef, useState } from 'react';
import { agregarNombrePropio } from '../utils/diccionarioPropios.js';

function escaparHtml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function markersAHtml(texto) {
  const escapado = escaparHtml(texto || '');
  const conNegritas = escapado.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return conNegritas.replace(/\n/g, '<br>');
}

function nodoAMarkers(nodo) {
  let resultado = '';
  nodo.childNodes.forEach(hijo => {
    if (hijo.nodeType === Node.TEXT_NODE) {
      resultado += hijo.textContent;
    } else if (hijo.nodeName === 'BR') {
      resultado += '\n';
    } else if (hijo.nodeName === 'STRONG' || hijo.nodeName === 'B') {
      const interno = nodoAMarkers(hijo);
      resultado += interno ? `**${interno}**` : '';
    } else if (hijo.nodeName === 'DIV' || hijo.nodeName === 'P') {
      if (resultado && !resultado.endsWith('\n')) resultado += '\n';
      resultado += nodoAMarkers(hijo);
    } else {
      resultado += nodoAMarkers(hijo);
    }
  });
  return resultado;
}

export default function EditorOcultable({ id, value, onChange, placeholder }) {
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
    const markers = nodoAMarkers(ref.current);
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
    document.execCommand('bold', false, null);
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
      {botonPos && (
        <div
          style={{ position: 'absolute', top: botonPos.top, left: botonPos.left, display: 'flex', gap: '4px' }}
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
        className="ter-textarea ter-textarea-editable"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={sincronizar}
        onMouseUp={manejarSeleccion}
        onKeyUp={manejarSeleccion}
        onBlur={() => setBotonPos(null)}
        onPaste={manejarPegado}
      ></div>
    </div>
  );
}

function manejarPegado(e) {
  e.preventDefault();
  const texto = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, texto);
}