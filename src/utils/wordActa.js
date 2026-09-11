// src/utils/wordActa.js
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun, Header, Footer, PageNumber, NumberFormat } from 'docx';
import { parsearFechaLocal, padNumber } from './fechas.js';

// ========== FUNCIÓN PARA CONVERTIR NÚMEROS A LETRAS ==========
function numeroALetras(num) {
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (num === 0) return 'CERO';
  if (num < 0) return 'MENOS ' + numeroALetras(-num);

  let parteEntera = Math.floor(num);
  let resultado = '';

  const miles = Math.floor(parteEntera / 1000);
  if (miles > 0) {
    if (miles === 1) resultado += 'MIL ';
    else resultado += numeroALetras(miles) + ' MIL ';
    parteEntera %= 1000;
  }

  const centena = Math.floor(parteEntera / 100);
  if (centena > 0) {
    if (centena === 1 && parteEntera % 100 === 0) resultado += 'CIEN ';
    else resultado += centenas[centena] + ' ';
    parteEntera %= 100;
  }

  if (parteEntera > 0) {
    if (parteEntera < 10) {
      resultado += unidades[parteEntera] + ' ';
    } else if (parteEntera >= 10 && parteEntera < 20) {
      resultado += especiales[parteEntera - 10] + ' ';
    } else {
      const decena = Math.floor(parteEntera / 10);
      const unidad = parteEntera % 10;
      if (decena === 2 && unidad > 0) {
        resultado += 'VEINTI' + unidades[unidad].toLowerCase() + ' ';
      } else {
        resultado += decenas[decena];
        if (unidad > 0) resultado += ' Y ' + unidades[unidad].toLowerCase();
        resultado += ' ';
      }
    }
  }

  return resultado.trim();
}

// ========== CORRECCIÓN DE ACENTOS EN FECHAS ==========
function corregirAcentosFecha(texto) {
  return texto
    .replace(/VEINTISEIS/g, 'VEINTISÉIS')
    .replace(/veintiseis/g, 'veintiséis');
}

function convertirNumeroALetras(num) {
  let texto = numeroALetras(num);
  texto = corregirAcentosFecha(texto);
  return texto.toUpperCase();
}

// ========== LIMPIEZA DE ASTERISCOS ==========
function limpiarAsteriscos(texto) {
  if (!texto) return texto;
  return texto.replace(/\*\*/g, '').replace(/\*/g, '');
}

// ========== OBTENER DIMENSIONES DE LA IMAGEN ==========
async function obtenerDimensiones(blob, objectUrl) {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      const w = bitmap.width || 0;
      const h = bitmap.height || 0;
      if (typeof bitmap.close === 'function') bitmap.close();
      if (w > 0 && h > 0) return { width: w, height: h };
    }
  } catch { /* fallback a Image */ }
  try {
    const dims = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = objectUrl;
    });
    if (dims.width > 0 && dims.height > 0) return dims;
  } catch { /* sin dimensiones */ }
  return { width: 600, height: 200 };
}

// ========== CARGAR IMAGEN DESDE /public ==========
async function cargarImagen(url) {
  const base = (import.meta.env.BASE_URL || '/');
  const baseLimpia = base.endsWith('/') ? base.slice(0, -1) : base;

  // /logo.png (tu caso) y variantes por si cambia el BASE_URL
  const candidatos = [
    url,
    `${baseLimpia}/logo.png`,
    '/logo.png',
    'logo.png',
  ];
  const vistos = [...new Set(candidatos.filter(Boolean))];

  for (const intento of vistos) {
    try {
      const response = await fetch(intento, { cache: 'no-store' });
      if (!response.ok) {
        console.warn(`Logo: status ${response.status} en ${intento}`);
        continue;
      }
      const blob = await response.blob();
      if (!blob.type || !blob.type.startsWith('image/')) {
        console.warn(`Logo: contenido no es imagen en ${intento} (type=${blob.type})`);
        continue;
      }
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      const objectUrl = URL.createObjectURL(blob);
      let width = 0, height = 0;
      try {
        const dims = await obtenerDimensiones(blob, objectUrl);
        width = dims.width;
        height = dims.height;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      console.info(`Logo cargado desde ${intento} (${width}x${height}, ${data.length} bytes)`);
      return { data, width, height };
    } catch (error) {
      console.warn(`No se pudo cargar el logo desde ${intento}:`, error);
    }
  }
  console.warn('No se pudo cargar el logo en ninguna ruta:', vistos);
  return null;
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
  const lineasAcuerdo = (sec.acuerdo || '').split('\n').filter(l => l.trim() !== '');
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

// ========== FUNCIÓN PRINCIPAL ==========
export async function generarWordActa(secciones, proyectoMeta, asistentes = [], sesionData = {}) {
  // Filtrar para eliminar el punto de "Asuntos Generales"
  const seccionesFiltradas = secciones.filter(sec =>
    sec.seccion?.toLowerCase() !== 'asuntos generales' && !sec.confidencial
  );

  if (seccionesFiltradas.length === 0) {
    alert('No hay puntos para generar el acta (se excluyeron Asuntos Generales).');
    return;
  }

  const fechaObj = proyectoMeta.fecha ? parsearFechaLocal(proyectoMeta.fecha) : new Date();
  const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
  const anio = fechaObj.getFullYear();

  const diaNum = fechaObj.getDate();
  const diaLetras = convertirNumeroALetras(diaNum);
  const anioLetras = convertirNumeroALetras(anio);

  const fechaConDia = `${diaLetras} DE ${mes} DE ${anioLetras}`;
  const fechaConDiaCorregida = corregirAcentosFecha(fechaConDia);

  const tipoSesion = proyectoMeta.tipoSesion || '';
  const numeroSesion = proyectoMeta.numeroSesion || '';
  const numeroSesionNum = parseInt(numeroSesion, 10);
  const numeroSesionLetras = isNaN(numeroSesionNum) ? numeroSesion : convertirNumeroALetras(numeroSesionNum);

  const tituloSesion = tipoSesion && numeroSesion
    ? `SESIÓN ${tipoSesion.toUpperCase()} NÚMERO ${numeroSesionLetras}`
    : 'ACTA DE SESIÓN';

  const parrafos = [];
  const interlineado115 = { line: 276, lineRule: 'auto' };

  // ========== CARGA DE IMAGEN ==========
  // Tu logo está en public/logo.png → se sirve como /logo.png
  const imagenData = await cargarImagen('/logo.png');
  let imagenDataBin = null;
  let imgWidth = 0, imgHeight = 0;
  if (imagenData) {
    imagenDataBin = imagenData.data;
    imgWidth = imagenData.width;
    imgHeight = imagenData.height;
  }

  // ========== TÍTULO ==========
  const tituloTexto = `ACTA DE LA ${tituloSesion} DEL PLENO DEL ÓRGANO DE ADMINISTRACIÓN JUDICIAL CORRESPONDIENTE AL DÍA ${fechaConDiaCorregida}`;
  parrafos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { ...interlineado115, after: 500 },
    children: [
      new TextRun({
        text: tituloTexto,
        bold: true,
        size: 28,
        color: '000000',
        font: 'Arial',
      }),
    ],
  }));

  // ========== INTRODUCCIÓN ==========
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

  parrafos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { ...interlineado115, before: 0, after: 300 },
    indent: { firstLine: 720 },
    children: [
      new TextRun({
        text: textoIntro,
        bold: false,
        size: 24,
        color: '000000',
        font: 'Arial',
      }),
    ],
  }));

  // ========== PUNTOS ==========
  let numeroGlobal = 1;

  seccionesFiltradas.forEach(sec => {
    const identificador = `${numeroGlobal}. PLE./${padNumber(numeroGlobal, 3)}.- `;

    // ----- CONTENIDO ESPECIAL PARA EL PRIMER PUNTO -----
    let contenido = limpiarAsteriscos(sec.contenido) || '';
    if (numeroGlobal === 1) {
      const diaLetrasMin = diaLetras.toLowerCase();
      const mesLetras = mes.toLowerCase();
      const anioLetrasMin = anioLetras.toLowerCase();
      const fechaTexto = `${diaLetrasMin} de ${mesLetras} de ${anioLetrasMin}`;
      const fechaTextoCorregida = corregirAcentosFecha(fechaTexto);
      const totalPuntos = seccionesFiltradas.length;
      const totalPuntosLetras = numeroALetras(totalPuntos).toLowerCase();
      contenido = `Se somete a consideración el orden del día de la sesión ${tipoSesion.toLowerCase()} de ${fechaTextoCorregida}, con ${totalPuntosLetras} puntos.`;
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

    // 1. Punto de acuerdo
    parrafos.push(new Paragraph({
      indent: { left: 720, hanging: 360 },
      spacing: { before: 160, after: 240 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: identificador, bold: true, size: 24, color: '000000', font: 'Arial' }),
        new TextRun({ text: contenido, bold: false, size: 24, color: '000000', font: 'Arial' }),
      ],
    }));

    // 2. Votación
    if (tieneVotacion) {
      parrafos.push(new Paragraph({
        indent: { left: 720 },
        spacing: {
          before: 0,
          after: tieneAcuerdo ? 120 : 280,
          line: 360,
          lineRule: 'auto'
        },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: votacion, size: 24, color: '000000', font: 'Arial' })],
      }));
    }

    // 3. Acuerdo
    if (tieneAcuerdo) {
      lineasAcuerdo.forEach((linea, i) => {
        const children = formatearLineaAcuerdo(linea);
        parrafos.push(new Paragraph({
          indent: { left: 720 },
          spacing: { before: 0, after: i === lineasAcuerdo.length - 1 ? 280 : 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: children,
        }));
      });
    }

    // 4. Anexo (siempre)
    const textoAnexo = `La documentación relativa a este punto se agrega al apéndice como Anexo ${numeroGlobal}.`;
    parrafos.push(new Paragraph({
      indent: { left: 720 },
      spacing: { before: 0, after: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({
        text: textoAnexo,
        size: 24,
        color: '000000',
        font: 'Arial'
      })],
    }));

    numeroGlobal++;
  });

  // ========== CIERRE ==========
  let horaFin = '<<hora>>';
  if (sesionData.horaFin) {
    horaFin = new Date(sesionData.horaFin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } else if (sesionData.horaInicio) {
    horaFin = new Date(sesionData.horaInicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  const textoCierre = `No habiendo otro asunto que tratar, se da por concluida la sesión a las ${horaFin} horas del día de su fecha, firmando al calce el Presidente del Órgano de Administración Judicial y la persona titular de la Secretaría Ejecutiva del Pleno, de conformidad con lo dispuesto en el artículo 91 de la Ley Orgánica del Poder Judicial de la Federación.`;

  parrafos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { ...interlineado115, before: 280, after: 0 },
    indent: { left: 720 },
    children: [
      new TextRun({
        text: textoCierre,
        size: 24,
        color: '000000',
        font: 'Arial'
      })
    ]
  }));

  // ========== ENCABEZADO Y PIE DE PÁGINA ==========
  const headerChildren = [];
  if (imagenDataBin && imgWidth > 0 && imgHeight > 0) {
    const targetWidth = 120;
    const aspectRatio = imgWidth / imgHeight;
    const targetHeight = Math.round(targetWidth / aspectRatio);

    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new ImageRun({
            data: imagenDataBin,
            transformation: { width: targetWidth, height: targetHeight },
            type: 'png',
          }),
        ],
      })
    );
  } else {
    console.warn('Encabezado sin logo: no se pudo cargar /logo.png', { imgWidth, imgHeight, tieneData: !!imagenDataBin });
  }

  const footerChildren = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          children: [PageNumber.CURRENT],
          bold: true,
          size: 20,
          color: '000000',
          font: 'Arial',
        }),
      ],
    }),
  ];

  const section = {
    properties: {},
    headers: {
      default: new Header({
        children: headerChildren,
      }),
    },
    footers: {
      default: new Footer({
        children: footerChildren,
      }),
    },
    children: parrafos,
  };

  const doc = new Document({ sections: [section] });
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