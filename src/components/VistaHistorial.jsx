import { useEffect, useState } from 'react';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { formatearFechaES } from '../utils/fechas.js';
import { obtenerEventosPorSesion } from '../utils/eventosDB.js';

const FILTROS_CRUD = [
  { id: 'todos', label: 'Todos' },
  { id: 'punto_crear', label: 'Creaciones' },
  { id: 'punto_editar', label: 'Ediciones' },
  { id: 'punto_eliminar', label: 'Eliminaciones' }
];

function formatearHoraEvento(ts) {
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
function formatearDiaEvento(ts) {
  return new Date(ts).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function VistaHistorial() {
  const { proyectoMeta, sesionActivaFecha } = useProyecto();
  const [eventos, setEventos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [cargando, setCargando] = useState(true);

  const tipo = proyectoMeta.tipoSesion || 'Ordinaria';
  const numero = proyectoMeta.numeroSesion || 1;
  const fecha = proyectoMeta.fecha ? formatearFechaES(proyectoMeta.fecha) : 'Fecha no definida';

  useEffect(() => {
    if (!sesionActivaFecha) { setEventos([]); setCargando(false); return; }
    setCargando(true);
    obtenerEventosPorSesion(sesionActivaFecha)
      .then(setEventos)
      .catch(err => console.error('No se pudo cargar el historial:', err))
      .finally(() => setCargando(false));
  }, [sesionActivaFecha]);

  const eventosFiltrados = (filtro === 'todos' ? eventos : eventos.filter(e => e.categoria === filtro))
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp);

  const grupos = [];
  eventosFiltrados.forEach(ev => {
    const diaLabel = formatearDiaEvento(ev.timestamp);
    let grupo = grupos.find(g => g.diaLabel === diaLabel);
    if (!grupo) { grupo = { diaLabel, items: [] }; grupos.push(grupo); }
    grupo.items.push(ev);
  });

  return (
    <>
      <div className="doc-header">
        <div className="doc-type">Historial</div>
        <div className="doc-title">Sesión {tipo} N° {numero}</div>
        <div className="doc-sub">{fecha}</div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {FILTROS_CRUD.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '14px',
              border: '1px solid ' + (filtro === f.id ? '#1a1a1a' : '#ddd'),
              background: filtro === f.id ? '#1a1a1a' : '#fff',
              color: filtro === f.id ? '#fff' : '#555',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="placeholder-msg" style={{ marginTop: '40px' }}>Cargando historial...</div>
      ) : grupos.length === 0 ? (
        <div className="placeholder-msg" style={{ marginTop: '40px' }}><strong>Sin eventos registrados</strong></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {grupos.map(grupo => (
            <div key={grupo.diaLabel}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                {grupo.diaLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {grupo.items.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '11px', color: '#999', minWidth: '42px', paddingTop: '2px', fontFamily: 'DM Mono, monospace' }}>
                      {formatearHoraEvento(ev.timestamp)}
                    </div>
                    <div style={{ flex: '1', borderLeft: '2px solid #e0e0e0', paddingLeft: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>
                        <strong>{ev.usuarioNombre || ev.usuarioCorreo || 'Usuario'}</strong> · {ev.accion}
                      </div>
                      {ev.detalle && <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>{ev.detalle}</div>}
                      {ev.usuarioCorreo && <div style={{ fontSize: '10.5px', color: '#bbb', marginTop: '2px' }}>{ev.usuarioCorreo}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}