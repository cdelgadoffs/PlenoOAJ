import { useEffect, useState } from 'react';
import { renderConOcultos } from '../utils/texto.js';

export default function VistaPreviaFlotante({ form, visible, anclaRef }) {
  const [pos, setPos] = useState(null);

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
        <div style={{ fontWeight: 700, marginBottom: '20px' }}>
          {form.contenido ? renderConOcultos(form.contenido) : <span style={{ color: '#aaa' }}>Punto de acuerdo...</span>}
        </div>
        <div>
          {form.acuerdo ? renderConOcultos(form.acuerdo) : <span style={{ color: '#aaa' }}>Acuerdos...</span>}
        </div>
      </div>
    </div>
  );
}