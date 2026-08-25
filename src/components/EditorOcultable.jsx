import { useEffect, useRef, useState } from 'react';

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
      return;
    }
    const range = sel.getRangeAt(0);
    if (!ref.current || !ref.current.contains(range.commonAncestorContainer)) {
      setBotonPos(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const contenedorRect = ref.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { setBotonPos(null); return; }
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

  return (
    <div style={{ position: 'relative' }}>
      {botonPos && (
        <button
          type="button"
          className="btn-ocultar-flotante"
          style={{ position: 'absolute', top: botonPos.top, left: botonPos.left }}
          onMouseDown={(e) => { e.preventDefault(); ocultarSeleccion(); }}
        >
          <i className="fas fa-eye-slash"></i>
        </button>
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