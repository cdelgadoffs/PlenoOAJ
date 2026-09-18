function formatearVotante(nombre, asistentes) {
  const a = asistentes.find(x => x.nombre === nombre);
  if (!a) return nombre;
  const articulo = a.genero === 'femenino' ? 'la' : 'el';
  const gradoMap = {
    'Licenciatura': a.genero === 'femenino' ? 'licenciada' : 'licenciado',
    'Maestría': a.genero === 'femenino' ? 'maestra' : 'maestro',
    'Doctorado': a.genero === 'femenino' ? 'doctora' : 'doctor'
  };
  return `${articulo} ${gradoMap[a.grado] || ''} ${a.nombre}`.replace(/\s+/g, ' ').trim();
}

export function describirVotacionEngrose(tipoVotacionStr, asistentes = []) {
  const porUnanimidad = 'por unanimidad de votos ';
  if (!tipoVotacionStr) return porUnanimidad;
  let v;
  try { v = JSON.parse(tipoVotacionStr); } catch { return porUnanimidad; }

  if (v.voto === 1 || v.voto === 2) {
    const cantidadTexto = v.voto === 1 ? 'cuatro' : 'tres';
    const nombresVotantes = (v.quorum && v.quorum.length > 0)
      ? v.quorum.map(n => formatearVotante(n, asistentes)).join(' y ')
      : '<<pendiente>>';
    return `por mayoría de ${cantidadTexto} votos, con el voto en contra de ${nombresVotantes}, `;
  }
  if (v.voto === 3) return 'por decisión de retirar el asunto, ';
  if (v.votacion === 1) return 'por unanimidad de votos, en votación concurrente, ';
  return porUnanimidad;
}
