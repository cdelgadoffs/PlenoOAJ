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

const FILTROS_TECNICOS = [
  { id: 'todos', label: 'Todos' },
  { id: 'sesion', label: 'Sesión' },
  { id: 'lista', label: 'Lista de puntos' },
  { id: 'respaldo', label: 'Respaldo' }
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
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
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

  const eventosCrud = eventos.filter(e => e.categoria.startsWith('punto_'));
  const eventosTecnicos = eventos.filter(e => !e.categoria.startsWith('punto_'));

  const eventosCrudFiltrados = (filtro === 'todos' ? eventosCrud : eventosCrud.filter(e => e.categoria === filtro))
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp);

  const eventosTecnicosOrdenados = (filtroTecnico === 'todos' ? eventosTecnicos : eventosTecnicos.filter(e => e.categoria === filtroTecnico))
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp);

  function agruparPorDia(lista) {
    const grupos = [];
    lista.forEach(ev => {
      const diaLabel = formatearDiaEvento(ev.timestamp);
      let grupo = grupos.find(g => g.diaLabel === diaLabel);
      if (!grupo) { grupo = { diaLabel, items: [] }; grupos.push(grupo); }
      grupo.items.push(ev);
    });
    return grupos;
  }

  const gruposCrud = agruparPorDia(eventosCrudFiltrados);
  const gruposTecnicos = agruparPorDia(eventosTecnicosOrdenados);

  function colorPorCategoria(categoria) {
    if (categoria === 'punto_crear') return '#2e7d32';
    if (categoria === 'punto_editar') return '#1a56db';
    if (categoria === 'punto_eliminar') return '#c62828';
    return '#e0e0e0';
  }

  function resaltarCodigoPunto(texto) {
    const partes = texto.split(/(PLE\/\d+)/g);
    return partes.map((parte, i) =>
      /^PLE\/\d+$/.test(parte) ? <strong key={i}>{parte}</strong> : parte
    );
  }

  function renderGrupos(grupos, mensajeVacio) {
    if (grupos.length === 0) {
      return <div className="placeholder-msg" style={{ marginTop: '20px' }}>{mensajeVacio}</div>;
    }
    return (
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
                  <div style={{ flex: '1', borderLeft: '2px solid ' + colorPorCategoria(ev.categoria), paddingLeft: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a' }}>
                      <strong>{ev.usuarioNombre || ev.usuarioCorreo || 'Usuario'}</strong> · {resaltarCodigoPunto(ev.accion)}
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
    );
  }

  return (
    <>
      <div className="doc-header">
        <div className="doc-type">Historial</div>
        <div className="doc-title">Sesión {tipo} N° {numero}</div>
        <div className="doc-sub">{fecha}</div>
      </div>

      {cargando ? (
        <div className="placeholder-msg" style={{ marginTop: '40px' }}>Cargando historial...</div>
      ) : (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
          <div style={{ flex: '1', minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a', marginBottom: '10px' }}>Puntos del orden del día</div>
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
            {renderGrupos(gruposCrud, 'Sin eventos de puntos registrados')}
          </div>

          <div style={{ width: '1px', alignSelf: 'stretch', background: '#eee' }}></div>

          <div style={{ flex: '1', minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a', marginBottom: '10px' }}>Actividad técnica</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {FILTROS_TECNICOS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFiltroTecnico(f.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '14px',
                    border: '1px solid ' + (filtroTecnico === f.id ? '#1a1a1a' : '#ddd'),
                    background: filtroTecnico === f.id ? '#1a1a1a' : '#fff',
                    color: filtroTecnico === f.id ? '#fff' : '#555',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {renderGrupos(gruposTecnicos, 'Sin actividad técnica registrada')}
          </div>
        </div>
      )}
    </>
  );
}