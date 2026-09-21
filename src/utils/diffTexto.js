export function diferenciaTexto(anterior, nuevo) {
  const a = (anterior || '').trim();
  const n = (nuevo || '').trim();
  if (a === n) return { tipo: 'modificado', fragmento: '' };

  const palabrasA = a.split(/\s+/).filter(Boolean);
  const palabrasN = n.split(/\s+/).filter(Boolean);

  let inicio = 0;
  while (inicio < palabrasA.length && inicio < palabrasN.length && palabrasA[inicio] === palabrasN[inicio]) inicio++;

  let finA = palabrasA.length;
  let finN = palabrasN.length;
  while (finA > inicio && finN > inicio && palabrasA[finA - 1] === palabrasN[finN - 1]) { finA--; finN--; }

  const quitado = palabrasA.slice(inicio, finA).join(' ');
  const agregado = palabrasN.slice(inicio, finN).join(' ');

  if (!quitado && agregado) return { tipo: 'agregado', fragmento: agregado };
  if (quitado && !agregado) return { tipo: 'eliminado', fragmento: quitado };
  if (quitado && agregado) return { tipo: 'modificado', fragmentoAnterior: quitado, fragmento: agregado };
  return { tipo: 'modificado', fragmento: n };
}
