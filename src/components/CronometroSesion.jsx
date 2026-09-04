import { useState } from 'react';

function formatearHHMM(fechaMs) {
  return new Date(fechaMs).toTimeString().slice(0, 5);
}

function InputHoraEditable({ valorMs, onCambiar, color }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');

  function iniciarEdicion() {
    setTexto('');
    setEditando(true);
  }

  function confirmar() {
    const soloDigitos = texto.replace(/\D/g, '');
    if (soloDigitos.length === 3 || soloDigitos.length === 4) {
      const relleno = soloDigitos.padStart(4, '0');
      const h = relleno.slice(0, 2);
      const m = relleno.slice(2, 4);
      if (Number(h) <= 23 && Number(m) <= 59) {
        onCambiar(`${h}:${m}`);
      }
    }
    setEditando(false);
  }

  return (
    <input
      type="text"
      value={editando ? texto : formatearHHMM(valorMs)}
      onFocus={iniciarEdicion}
      onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onBlur={confirmar}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      placeholder="hhmm"
      style={{
        border: `1px solid ${color}`, borderRadius: '4px', padding: '2px 6px',
        fontSize: '18px', fontWeight: '700', color, background: '#fff',
        fontFamily: "'DM Mono', monospace", cursor: 'text', textAlign: 'center', width: '64px'
      }}
    />
  );
}

export default function HorariosCelebracion({ horaInicioSesion, horaFinSesion, onCambiarInicio, onCambiarFin }) {
  if (!horaInicioSesion && !horaFinSesion) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
      {horaInicioSesion && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#2e7d32',
          background: '#e6f7ed', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '10px 12px'
        }}>
          <span>Comenzó a las</span>
          <InputHoraEditable valorMs={horaInicioSesion} onCambiar={onCambiarInicio} color="#2e7d32" />
        </div>
      )}
      {horaFinSesion && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#b91c1c',
          background: '#fde8e8', border: '1px solid #ef9a9a', borderRadius: '8px', padding: '10px 12px'
        }}>
          <span>Finalizó a las</span>
          <InputHoraEditable valorMs={horaFinSesion} onCambiar={onCambiarFin} color="#b91c1c" />
        </div>
      )}
    </div>
  );
}