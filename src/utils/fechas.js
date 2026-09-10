export function toRoman(num) {
  const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV'];
  return roman[num-1] || num.toString();
}
export function padNumber(num, length) {
  return String(num).padStart(length, '0');
}
export function hoyLocalISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
export function parsearFechaLocal(fechaStr) {
  if (!fechaStr) return null;
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return new Date(fechaStr);
  const [anio, mes, dia] = partes.map(Number);
  return new Date(anio, mes - 1, dia);
}
export function formatearFechaES(fechaStr) {
  if (!fechaStr) return '';
  const fecha = parsearFechaLocal(fechaStr);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const anio = fecha.getFullYear();
  return `${dia} de ${mes} de ${anio}`;
}
export function formatearFechaCorta(fechaStr) {
  const fecha = parsearFechaLocal(fechaStr);
  return `Día ${fecha.getDate()}`;
}
export function calcularFechaAnterior(fechaStr, dias) {
  if (!fechaStr) return null;
  const fecha = parsearFechaLocal(fechaStr);
  fecha.setDate(fecha.getDate() - dias);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
export function sumarDias(fechaStr, dias) {
  const fecha = parsearFechaLocal(fechaStr);
  fecha.setDate(fecha.getDate() + dias);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${d}`;
}
export function getTituloPunto(sec, idx) {
  const roman = toRoman(idx + 1);
  const num = idx + 1;
  const codigo = 'PLE/' + padNumber(num, 3);
  return roman + '. ' + codigo;
}
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function obtenerFechasDisponiblesExtraordinaria(sesiones) {
  const hoy = hoyLocalISO();
  const ordinarias = Object.entries(sesiones)
    .filter(([, s]) => s.tipoSesion === 'Ordinaria')
    .map(([fecha]) => fecha)
    .sort();

  let anterior = null;
  let siguiente = null;
  for (const f of ordinarias) {
    if (f <= hoy) anterior = f;
    if (f > hoy && !siguiente) siguiente = f;
  }

  const inicio = anterior && sumarDias(anterior, 1) > hoy ? sumarDias(anterior, 1) : hoy;
  const fin = siguiente ? sumarDias(siguiente, -1) : sumarDias(hoy, 60);

  const disponibles = [];
  let cursor = inicio;
  while (cursor <= fin) {
    const diaSemana = parsearFechaLocal(cursor).getDay();
    if (diaSemana !== 0 && diaSemana !== 3 && diaSemana !== 6) {
      disponibles.push({
        fecha: cursor,
        etiqueta: `${DIAS_SEMANA[diaSemana]} ${formatearFechaES(cursor)}`
      });
    }
    cursor = sumarDias(cursor, 1);
  }
  return disponibles;
}