import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { MarcaOculta, TamanoFuente } from '../utils/tiptapExtensions.js';
import { agregarNombrePropio } from '../utils/diccionarioPropios.js';
import { aplicarPrefijosAcuerdo } from '../utils/ordinales.js';
import { markersAHtml, nodoAMarkers } from '../utils/texto.js';

function extensionesEditor(placeholder) {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      bulletList: false,
      strike: false
    }),
    TextAlign.configure({ types: ['paragraph'], defaultAlignment: 'left' }),
    Placeholder.configure({ placeholder, showOnlyCurrent: false }),
    Table.configure({ resizable: false, allowTableNodeSelection: true, HTMLAttributes: { class: 'acta-tabla' } }),
    TableRow,
    TableHeader.configure({ HTMLAttributes: { class: 'acta-celda' } }),
    TableCell.configure({ HTMLAttributes: { class: 'acta-celda' } }),
    MarcaOculta,
    TamanoFuente
  ];
}

export default function EditorOcultable({ id, value, onChange, placeholder, autoAjustar, negritaTotal, modoAcuerdo, modoConsiderando, className, style, soloLectura, onFocusEditor }) {
  const [botonPos, setBotonPos] = useState(null);
  const [textoSeleccionado, setTextoSeleccionado] = useState('');
  const ultimoValorExternoRef = useRef(value);

  const claseEditable = className ?? ('ter-textarea ter-textarea-editable' + (autoAjustar ? ' ter-textarea-auto' : ''));
  const estiloEditable = { ...(negritaTotal ? { fontWeight: 700 } : null), ...style };

  const editor = useEditor({
    extensions: extensionesEditor(placeholder),
    content: markersAHtml(value) || '<p></p>',
    editable: !soloLectura,
    editorProps: {
      attributes: {
        ...(id ? { id } : null),
        class: claseEditable,
        style: Object.entries(estiloEditable).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`).join(';')
      }
    },
    onUpdate: ({ editor }) => sincronizar(editor),
    onSelectionUpdate: () => manejarSeleccion(),
    onFocus: ({ editor }) => onFocusEditor && onFocusEditor(editor),
    onBlur: ({ editor }) => {
      setBotonPos(null);
      editor.commands.setContent(markersAHtml(ultimoValorExternoRef.current) || '<p></p>', false);
    }
  }, []);

  useEffect(() => {
    if (!editor) return;
    if (value !== ultimoValorExternoRef.current && !editor.isFocused) {
      editor.commands.setContent(markersAHtml(value) || '<p></p>', false);
    }
    ultimoValorExternoRef.current = value;
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!soloLectura);
  }, [soloLectura, editor]);

  function sincronizar(editorInstancia) {
    let markers = nodoAMarkers(editorInstancia.view.dom);
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
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !editor) {
      setBotonPos(null);
      setTextoSeleccionado('');
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editor.view.dom.contains(range.commonAncestorContainer)) {
      setBotonPos(null);
      setTextoSeleccionado('');
      return;
    }
    const rect = range.getBoundingClientRect();
    const contenedorRect = editor.view.dom.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { setBotonPos(null); return; }
    setTextoSeleccionado(sel.toString());
    setBotonPos({
      top: rect.top - contenedorRect.top - 34,
      left: rect.right - contenedorRect.left
    });
  }

  function ocultarSeleccion() {
    if (!editor) return;
    editor.chain().focus().setMark('oculto').run();
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
      <EditorContent editor={editor} />
    </div>
  );
}
