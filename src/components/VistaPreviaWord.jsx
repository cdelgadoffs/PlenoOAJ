import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

export default function VistaPreviaWord({ blob }) {
  const contenedorRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!blob || !contenedorRef.current) return;
    setError(false);
    contenedorRef.current.innerHTML = '';
    renderAsync(blob, contenedorRef.current, undefined, {
      className: 'docx-preview',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true
    }).catch(() => setError(true));
  }, [blob]);

  if (error) return <p>No se pudo generar la vista previa de este documento Word.</p>;

  return <div className="vista-previa-word-scroll" ref={contenedorRef}></div>;
}
