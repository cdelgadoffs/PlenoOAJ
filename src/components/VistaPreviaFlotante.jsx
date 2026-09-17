import { useEffect, useState } from 'react';
import { renderConOcultos, markersAHtml, nodoAMarkers } from '../utils/texto.js';
import EditorOcultable from './EditorOcultable.jsx';

export default function VistaPreviaFlotante({ form, setForm, visible, anclaRef }) {
  const [pos, setPos] = useState(null);
  const [considerandos, setConsiderandos] = useState('');

  useEffect(() => {
    if (!visible || !anclaRef.current) { setPos(null); return; }
    function calcular() {
      const rect = anclaRef.current.getBoundingClientRect();
      setPos({ left: rect.right, top: rect.top, height: rect.height });
    }
    calcular();
    window.addEventListener('resize', calcular);
    return () => window.removeEventListener('resize', calcular);
  }, [visible, anclaRef]);

  if (!visible || !pos) return null;

  return (
    <div className="vista-previa-flotante" style={{ left: pos.left, top: pos.top, height: pos.height }}>
      <div className="vista-previa-hoja">
        <div style={{ textAlign: 'left', marginBottom: '10px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '100px', marginBottom: '0px' }} />

        </div>
        <div style={{ textAlign: 'justify', marginBottom: '20px' }}>
          <strong>El Pleno del Órgano de Administración Judicial del Poder Judicial de la Federación</strong>, con fundamento en los artículos 94, párrafo segundo, 100, párrafos décimo segundo, décimo tercero y décimo octavo de la Constitución Política de los Estados Unidos Mexicanos; así como 1, fracción VIII, 70, 71, 78, 79, primer párrafo, 80, fracción II de la Ley Orgánica del Poder Judicial de la Federación; y,
        </div>
        <div style={{ fontWeight: 700, textAlign: 'center', marginBottom: '10px' }}>CONSIDERANDO</div>
        <div style={{ marginBottom: '20px' }}>
          <EditorOcultable
            value={considerandos}
            onChange={setConsiderandos}
            placeholder="Considerandos..."
            modoConsiderando
            className=""
            style={{ outline: 'none' }}
          />
        </div>
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
  );
}