// src/utils/wordActa.js
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun, Header, Footer, PageNumber } from 'docx';
import { parsearFechaLocal, padNumber } from './fechas.js';
import { cargarImagen } from './logoDocx.js';
import { numeroALetras, corregirAcentosFecha, convertirNumeroALetras } from './fechaLetras.js';
import { limpiarMarcadores } from './texto.js';

// ========== LIMPIEZA DE ASTERISCOS ==========
function limpiarAsteriscos(texto) {
  if (!texto) return texto;
  return limpiarMarcadores(texto).replace(/\*/g, '');
}

// ========== FORMATEAR LÍNEA DE ACUERDO ==========
function formatearLineaAcuerdo(linea) {
  const patron = /^(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|OCTAVO|NOVENO|DÉCIMO|ÚNICO)(\.\s*|:\s*)(.*)/i;
  const match = linea.match(patron);
  if (match) {
    const palabra = match[1].toUpperCase();
    const separador = match[2];
    const resto = match[3] || '';
    return [
      new TextRun({ text: palabra + separador, bold: true, size: 24, color: '000000', font: 'Arial' }),
      new TextRun({ text: resto, bold: false, size: 24, color: '000000', font: 'Arial' })
    ];
  } else {
    return [new TextRun({ text: linea, size: 24, color: '000000', font: 'Arial' })];
  }
}

// ========== GENERAR TEXTO DE VOTACIÓN ==========
function generarTextoVotacion(sec, asistentes) {
  if (!sec.tipoVotacion) return '';
  let v;
  try { v = JSON.parse(sec.tipoVotacion); } catch { return limpiarAsteriscos(sec.tipoVotacion); }

  const estadoLabel = v.estado ? 'aprueba' : 'acuerda';
  const lineasAcuerdo = limpiarAsteriscos(sec.acuerdo || '').split('\n').filter(l => l.trim() !== '');
  const esAcuerdoUnico = lineasAcuerdo.length === 1 && /^ÚNICO\.?\s*/i.test(lineasAcuerdo[0].trim());
  const textoAcuerdoUnico = esAcuerdoUnico
    ? lineasAcuerdo[0].trim().replace(/^ÚNICO\.?\s*/i, '').replace(/\.\s*$/, '')
    : '';

  function formatearVotante(nombre) {
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

  // Mayoría de votos
  if (v.voto === 1 || v.voto === 2) {
    const cantidadTexto = v.voto === 1 ? 'cuatro' : 'tres';
    const nombresVotantes = (v.quorum && v.quorum.length > 0)
      ? v.quorum.map(formatearVotante).join(' y ')
      : '<<pendiente>>';
    const base = `El Pleno, por mayoría de ${cantidadTexto} votos, con el voto en contra de ${nombresVotantes}, `;
    if (esAcuerdoUnico) return base + estadoLabel + ' ' + textoAcuerdoUnico.charAt(0).toLowerCase() + textoAcuerdoUnico.slice(1) + '.';
    return base + estadoLabel + ':';
  }

  const votoLabel = ['por unanimidad', 'por mayoría de 4 votos', 'por mayoría de 3 votos', 'acuerda retirar'][v.voto] || '';
  const esRetirar = v.voto === 3;
  const votacionLabel = esRetirar ? '' : (v.votacion === 1 ? 'votación concurrente' : 'votación económica');
  const quorumTxt = (v.quorum && v.quorum.length > 0) ? ` (quórum: ${v.quorum.join(', ')})` : '';
  const esUnanimidadConcurrente = v.voto === 0 && v.votacion === 1;

  if (esUnanimidadConcurrente && v.precision) {
    const base = `El Pleno, por unanimidad de votos, con la precisión de que ${v.precision}, ${estadoLabel}`;
    if (esAcuerdoUnico) return base + ' ' + textoAcuerdoUnico.charAt(0).toLowerCase() + textoAcuerdoUnico.slice(1) + '.';
    return base + '.';
  }

  if (esRetirar) return `El Pleno, ${votoLabel}.`;

  const base = `El Pleno, en ${votacionLabel}, ${votoLabel}, ${estadoLabel}${quorumTxt}`;
  if (esAcuerdoUnico) return base + ' ' + textoAcuerdoUnico.charAt(0).toLowerCase() + textoAcuerdoUnico.slice(1) + '.';
  return base + '.';
}

// ========== TÍTULO ==========
function calcularTituloActa(proyectoMeta) {
  const fechaObj = proyectoMeta.fecha ? parsearFechaLocal(proyectoMeta.fecha) : new Date();
  const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
  const anio = fechaObj.getFullYear();
  const diaNum = fechaObj.getDate();
  const diaLetras = convertirNumeroALetras(diaNum);
  const anioLetras = convertirNumeroALetras(anio);
  const fechaConDiaCorregida = corregirAcentosFecha(`${diaLetras} DE ${mes} DE ${anioLetras}`);
  const tipoSesion = proyectoMeta.tipoSesion || '';
  const numeroSesion = proyectoMeta.numeroSesion || '';
  const numeroSesionNum = parseInt(numeroSesion, 10);
  const numeroSesionLetras = isNaN(numeroSesionNum) ? numeroSesion : convertirNumeroALetras(numeroSesionNum);
  const tituloSesion = tipoSesion && numeroSesion
    ? `SESIÓN ${tipoSesion.toUpperCase()} NÚMERO ${numeroSesionLetras}`
    : 'ACTA DE SESIÓN';
  return {
    tituloSesion,
    tituloTexto: `ACTA DE LA ${tituloSesion} DEL PLENO DEL ÓRGANO DE ADMINISTRACIÓN JUDICIAL CORRESPONDIENTE AL DÍA ${fechaConDiaCorregida}`,
    diaLetras, mes, anio, anioLetras, tipoSesion, fechaConDiaCorregida
  };
}

// ========== BLOQUES EDITABLES DEL ACTA ==========
// Un "bloque" es cada fragmento de texto editable del acta (introducción,
// contenido/votación/acuerdo/anexo de cada punto, cierre). El título nunca
// es editable: siempre se recalcula desde proyectoMeta. `key` identifica el
// bloque para poder guardar su texto editado en sesionData.actaOverrides;
// `textoAuto` es lo que se mostraría si nunca se edita ese bloque.
export function construirBloquesActa(secciones, proyectoMeta, asistentes = [], sesionData = {}) {
  const seccionesFiltradas = secciones.filter(sec =>
    sec.seccion?.toLowerCase() !== 'asuntos generales'
  );
  if (seccionesFiltradas.length === 0) return [];

  const { diaLetras, mes, anio, anioLetras, tipoSesion, fechaConDiaCorregida } = calcularTituloActa(proyectoMeta);

  const horaInicio = sesionData.horaInicio
    ? new Date(sesionData.horaInicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '<<hora>>';
  const presidente = asistentes.find(a => a.presidente);
  const miembros = asistentes.filter(a => !a.presidente && a.presente);
  function formatearNombreIntro(a) {
    const gradoMap = {
      'Licenciatura': a.genero === 'femenino' ? 'licenciada' : 'licenciado',
      'Maestría': a.genero === 'femenino' ? 'maestra' : 'maestro',
      'Doctorado': a.genero === 'femenino' ? 'doctora' : 'doctor'
    };
    return `${gradoMap[a.grado] || ''} ${a.nombre}`.trim();
  }
  const nombresAsistentes = [
    ...miembros.map(formatearNombreIntro),
    presidente ? `y el Presidente ${formatearNombreIntro(presidente)}` : ''
  ].filter(Boolean).join(', ');
  const textoIntro = `En la Ciudad de México, siendo las ${horaInicio} horas del ${fechaConDiaCorregida.toLowerCase()}, se reúnen de manera presencial en el salón del Pleno del Órgano de Administración Judicial para celebrar la sesión ${tipoSesion.toLowerCase()} convocada por las y los integrantes: ${nombresAsistentes || '<<integrantes>>'}; con lo cual se da cuenta sobre la adopción de las siguientes determinaciones:`;

  const bloques = [{ key: 'intro', tipo: 'intro', titulo: 'Introducción', textoAuto: textoIntro }];
  let numeroGlobal = 1;

  seccionesFiltradas.forEach(sec => {
    const n = numeroGlobal;
    const identificador = `${n}. PLE./${padNumber(n, 3)}.- `;

    if (sec.confidencial) {
      bloques.push({
        key: `punto_${sec.id}_contenido`, tipo: 'confidencial', identificador,
        titulo: `Punto ${n}`, textoAuto: 'CONFIDENCIAL'
      });
      numeroGlobal++;
      return;
    }

    let contenido = limpiarAsteriscos(sec.contenido) || '';
    if (n === 1) {
      const fechaTexto = corregirAcentosFecha(`${diaLetras.toLowerCase()} de ${mes.toLowerCase()} de ${anioLetras.toLowerCase()}`);
      const totalPuntos = seccionesFiltradas.length;
      const totalPuntosLetras = numeroALetras(totalPuntos).toLowerCase();
      contenido = `Se somete a consideración el orden del día de la sesión ${tipoSesion.toLowerCase()} de ${fechaTexto}, con ${totalPuntosLetras} puntos.`;
    }

    const acuerdo = limpiarAsteriscos(sec.acuerdo) || '';
    const lineasAcuerdo = acuerdo.split('\n').filter(l => l.trim() !== '');
    const esAcuerdoUnico = lineasAcuerdo.length === 1 && /^ÚNICO\.?\s*/i.test(lineasAcuerdo[0].trim());

    const esFijoAprobacion = sec.fijo === true && sec.seccion === 'aprobaciones';
    const textoVotoFijo = sec.id === 'sec_fijo_1'
      ? 'El Pleno, en votación económica, por unanimidad, aprueba el orden del día.'
      : 'El Pleno, en votación económica, por unanimidad, aprueba el acta e instruye la elaboración y publicación de la versión pública.';
    const votacion = esFijoAprobacion
      ? textoVotoFijo
      : (sec.votacionTextoManual !== undefined
        ? limpiarAsteriscos(sec.votacionTextoManual)
        : generarTextoVotacion(sec, asistentes));
    const tieneVotacion = !!votacion;
    const tieneAcuerdo = !esFijoAprobacion && !!acuerdo && !esAcuerdoUnico;

    bloques.push({ key: `punto_${sec.id}_contenido`, tipo: 'contenido', identificador, titulo: `Punto ${n}`, textoAuto: contenido });
    if (tieneVotacion) {
      bloques.push({ key: `punto_${sec.id}_votacion`, tipo: 'votacion', titulo: `Punto ${n} · Votación`, tieneAcuerdoDespues: tieneAcuerdo, textoAuto: votacion });
    }
    if (tieneAcuerdo) {
      bloques.push({ key: `punto_${sec.id}_acuerdo`, tipo: 'acuerdo', titulo: `Punto ${n} · Acuerdo`, textoAuto: lineasAcuerdo.join('\n') });
    }
    bloques.push({
      key: `punto_${sec.id}_anexo`, tipo: 'anexo', titulo: `Punto ${n} · Anexo`,
      textoAuto: `La documentación relativa a este punto se agrega al apéndice como Anexo ${n}.`
    });

    numeroGlobal++;
  });

  let horaFin = '<<hora>>';
  if (sesionData.horaFin) {
    horaFin = new Date(sesionData.horaFin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } else if (sesionData.horaInicio) {
    horaFin = new Date(sesionData.horaInicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  bloques.push({
    key: 'cierre', tipo: 'cierre', titulo: 'Cierre',
    textoAuto: `No habiendo otro asunto que tratar, se da por concluida la sesión a las ${horaFin} horas del día de su fecha, firmando al calce el Presidente del Órgano de Administración Judicial y la persona titular de la Secretaría Ejecutiva del Pleno, de conformidad con lo dispuesto en el artículo 91 de la Ley Orgánica del Poder Judicial de la Federación.`
  });

  return bloques;
}

// Texto final de un bloque: el editado por el usuario si existe, si no el automático.
export function textoDeBloque(bloque, overrides = {}) {
  const editado = overrides[bloque.key];
  return editado !== undefined ? editado : bloque.textoAuto;
}

function parrafosDeBloque(bloque, overrides) {
  const texto = textoDeBloque(bloque, overrides);
  const interlineado115 = { line: 276, lineRule: 'auto' };

  switch (bloque.tipo) {
    case 'intro':
      return [new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { ...interlineado115, before: 0, after: 300 },
        indent: { firstLine: 720 },
        children: [new TextRun({ text: texto, size: 24, color: '000000', font: 'Arial' })]
      })];
    case 'confidencial':
      return [new Paragraph({
        indent: { left: 720, hanging: 360 },
        spacing: { before: 160, after: 240 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({ text: bloque.identificador, bold: true, size: 24, color: '000000', font: 'Arial' }),
          new TextRun({ text: texto, bold: true, size: 24, color: '000000', font: 'Arial' })
        ]
      })];
    case 'contenido':
      return [new Paragraph({
        indent: { left: 720, hanging: 360 },
        spacing: { before: 160, after: 240 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({ text: bloque.identificador, bold: true, size: 24, color: '000000', font: 'Arial' }),
          new TextRun({ text: texto, bold: false, size: 24, color: '000000', font: 'Arial' })
        ]
      })];
    case 'votacion':
      return [new Paragraph({
        indent: { left: 720 },
        spacing: { before: 0, after: bloque.tieneAcuerdoDespues ? 120 : 280, line: 360, lineRule: 'auto' },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: texto, size: 24, color: '000000', font: 'Arial' })]
      })];
    case 'acuerdo': {
      const lineas = texto.split('\n').filter(l => l.trim() !== '');
      return lineas.map((linea, i) => new Paragraph({
        indent: { left: 720 },
        spacing: { before: 0, after: i === lineas.length - 1 ? 280 : 120 },
        alignment: AlignmentType.JUSTIFIED,
        children: formatearLineaAcuerdo(linea)
      }));
    }
    case 'anexo':
      return [new Paragraph({
        indent: { left: 720 },
        spacing: { before: 0, after: 280 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: texto, size: 24, color: '000000', font: 'Arial' })]
      })];
    case 'cierre':
      return [new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { ...interlineado115, before: 280, after: 0 },
        indent: { left: 720 },
        children: [new TextRun({ text: texto, size: 24, color: '000000', font: 'Arial' })]
      })];
    default:
      return [];
  }
}

// ========== FUNCIÓN PRINCIPAL ==========
// Único generador del acta: arma los bloques desde los puntos actuales y
// aplica encima los textos editados (sesionData.actaOverrides) que existan.
// Editada o no, siempre es esta la versión final y más reciente.
export async function generarWordActa(secciones, proyectoMeta, asistentes = [], sesionData = {}) {
  const bloques = construirBloquesActa(secciones, proyectoMeta, asistentes, sesionData);
  if (bloques.length === 0) {
    alert('No hay puntos para generar el acta (se excluyeron Asuntos Generales).');
    return;
  }
  const overrides = sesionData.actaOverrides || {};

  const { tituloSesion, tituloTexto } = calcularTituloActa(proyectoMeta);
  const interlineado115 = { line: 276, lineRule: 'auto' };

  // ========== CARGA DE IMAGEN ==========
  const imagenData = await cargarImagen('/logo.png');

  const parrafos = [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { ...interlineado115, after: 500 },
      children: [new TextRun({ text: tituloTexto, bold: true, size: 28, color: '000000', font: 'Arial' })]
    }),
    ...bloques.flatMap(b => parrafosDeBloque(b, overrides))
  ];

  // ========== ENCABEZADO Y PIE DE PÁGINA ==========
  const headerChildren = [];
  if (imagenData && imagenData.width > 0 && imagenData.height > 0) {
    const targetWidth = 120;
    const targetHeight = Math.round(targetWidth / (imagenData.width / imagenData.height));
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new ImageRun({ data: imagenData.data, transformation: { width: targetWidth, height: targetHeight }, type: 'png' })]
    }));
  } else {
    console.warn('Encabezado sin logo: no se pudo cargar /logo.png');
  }

  const footerChildren = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ children: [PageNumber.CURRENT], bold: true, size: 20, color: '000000', font: 'Arial' })]
    })
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      headers: { default: new Header({ children: headerChildren }) },
      footers: { default: new Footer({ children: footerChildren }) },
      children: parrafos
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Acta - ${tituloSesion}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
