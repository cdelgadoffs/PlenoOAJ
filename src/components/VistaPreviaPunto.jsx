import { renderConOcultos } from '../utils/texto.js';

export default function VistaPreviaPunto({ form }) {
  return (
    <div style={{
      background: '#fff', width: '100%', maxWidth: '650px', minHeight: '850px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.15)', padding: '40px 50px', fontSize: '13px', lineHeight: '1.6'
    }}>
      <div style={{ fontWeight: 700, marginBottom: '20px' }}>
        {form.contenido ? renderConOcultos(form.contenido) : <span style={{ color: '#aaa' }}>Punto de acuerdo...</span>}
      </div>
      <div>
        {form.acuerdo ? renderConOcultos(form.acuerdo) : <span style={{ color: '#aaa' }}>Acuerdos...</span>}
      </div>
    </div>
  );
}