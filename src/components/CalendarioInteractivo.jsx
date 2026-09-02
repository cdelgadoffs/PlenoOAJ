import React from 'react';
import './CalendarioInteractivo.css';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function CalendarioInteractivo({
  mes,                // string 'YYYY-MM'
  onChangeMes,        // función (delta) => void
  sesiones,           // objeto { 'YYYY-MM-DD': { ... } }
  proximaGlobal,      // string fecha de la próxima sesión o null
  hoy,                // string fecha actual 'YYYY-MM-DD'
  sesionActivaFecha,  // string fecha de sesión activa o null
  cargarSesion,       // función (fecha) => void
  modoFormulario,     // boolean
  onClose,            // función para cerrar el calendario (opcional)
}) {
  // Generar los días del mes
  const [anio, mesNum] = mes.split('-').map(Number);
  const fecha = new Date(anio, mesNum - 1, 1);
  const primerDiaSemana = fecha.getDay(); // 0=domingo
  const diasEnMes = new Date(anio, mesNum, 0).getDate();

  const dias = [];
  // Días vacíos al inicio
  for (let i = 0; i < primerDiaSemana; i++) {
    dias.push(null);
  }
  // Días del mes
  for (let d = 1; d <= diasEnMes; d++) {
    const fechaStr = `${anio}-${String(mesNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const sesion = sesiones[fechaStr] || null;
    dias.push({ dia: d, fecha: fechaStr, sesion });
  }

  const mesLabel = `${MESES[mesNum - 1]} ${anio}`;

  // Determinar estado de una sesión para el punto de color
  const getEstado = (fecha, sesion) => {
    if (!sesion) return null;
    const tieneContenido = sesion.secciones && sesion.secciones.some(s => !s.fijo);
    if (fecha === proximaGlobal) return 'proxima';
    if (fecha < hoy) {
      return tieneContenido ? 'celebrada' : 'no-celebrada';
    }
    return 'pendiente';
  };

  const handleDayClick = (fecha, sesion) => {
    if (sesion && !modoFormulario) {
      cargarSesion(fecha);
      if (onClose) onClose();
    }
  };

  return (
    <div className="calendario-interactivo">
      <div className="calendario-header">
        <button className="cinta-nav" onClick={() => onChangeMes(-1)}>◀</button>
        <span className="calendario-titulo">{mesLabel}</span>
        <button className="cinta-nav" onClick={() => onChangeMes(1)}>▶</button>
      </div>
      <div className="calendario-grid">
        {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => (
          <div key={d} className="calendario-dia-semana">{d}</div>
        ))}
        {dias.map((item, idx) => {
          if (item === null) {
            return <div key={`empty-${idx}`} className="calendario-dia-vacio" />;
          }
          const { dia, fecha, sesion } = item;
          const estado = getEstado(fecha, sesion);
          let color = 'transparent';
          let claseDia = 'calendario-dia';
          if (estado === 'proxima') color = '#007bff';
          else if (estado === 'celebrada') color = '#28a745';
          else if (estado === 'pendiente') color = '#6c757d';
          else if (estado === 'no-celebrada') color = '#dc3545';
          else claseDia += ' sin-sesion';

          const isActive = fecha === sesionActivaFecha;

          return (
            <div
              key={fecha}
              className={`${claseDia} ${isActive ? 'activo' : ''}`}
              onClick={() => handleDayClick(fecha, sesion)}
              style={{ cursor: sesion ? 'pointer' : 'default' }}
            >
              <span className="calendario-dia-numero">{dia}</span>
              {estado && (
                <span className="calendario-dia-indicador" style={{ backgroundColor: color }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}