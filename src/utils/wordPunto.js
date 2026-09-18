// Genera el .docx de un punto individual, reflejando el mismo contenido
// que se arma en VistaPreviaFlotante (logo, intro, bloques de acta, contenido y acuerdo).
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun, Header, Footer, PageNumber } from 'docx';
import { cargarImagen } from './logoDocx.js';
import { INTRO_ACTA_TEXTO, PUENTE_ACTA_TEXTO } from './textosActa.js';

export const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TITULOS_BLOQUE = {
  considerando: 'CONSIDERANDO',
  antecedente: 'ANTECEDENTES'
};

// Recorre una línea con marcadores **negrita**, _itálica_ y %%oculto%% (anidables)
// y devuelve segmentos planos {text, bold, italics} listos para TextRun.
// El texto oculto se muestra tal cual (documento interno de trabajo, no la versión pública).
function segmentosConEstilo(texto, estilo = {}) {
  const partes = texto.split(/(\*\*.+?\*\*|_.+?_|%%.+?%%)/g).filter(p => p !== '');
  let resultado = [];
  partes.forEach(parte => {
    const negrita = parte.match(/^\*\*(.+)\*\*$/);
    if (negrita) { resultado = resultado.concat(segmentosConEstilo(negrita[1], { ...estilo, bold: true })); return; }
    const italica = parte.match(/^_(.+)_$/);
    if (italica) { resultado = resultado.concat(segmentosConEstilo(italica[1], { ...estilo, italics: true })); return; }
    const oculto = parte.match(/^%%(.+)%%$/);
    if (oculto) { resultado.push({ text: oculto[1], ...estilo }); return; }
    resultado.push({ text: parte, ...estilo });
  });
  return resultado;
}

function lineaARuns(linea) {
  const segmentos = segmentosConEstilo(linea);
  if (segmentos.length === 0) return [new TextRun({ text: '', size: 24, color: '000000', font: 'Arial' })];
  return segmentos.map(seg => new TextRun({
    text: seg.text, bold: !!seg.bold, italics: !!seg.italics, size: 24, color: '000000', font: 'Arial'
  }));
}

function parrafosDeTexto(texto, opciones = {}) {
  const lineas = (texto || '').split('\n').filter(l => l.trim() !== '');
  let contadorLista = 0;
  return lineas.map((linea, i) => {
    const esLi = linea.startsWith('##li##');
    const runs = lineaARuns(esLi ? linea.slice(6) : linea);
    if (esLi) {
      contadorLista++;
      runs.unshift(new TextRun({ text: `${contadorLista}. `, size: 24, color: '000000', font: 'Arial' }));
    } else {
      contadorLista = 0;
    }
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: esLi ? { left: 400 } : undefined,
      spacing: { after: i === lineas.length - 1 ? (opciones.afterUltima ?? 200) : 120 },
      children: runs
    });
  });
}

export async function generarWordPunto(punto, proyectoMeta = {}) {
  const { contenido = '', acuerdo = '', bloquesActa = [], plantilla = 'introduccion' } = punto;

  // El logo va en el encabezado (Header), no como párrafo del cuerpo, para
  // que docx lo repita en todas las páginas igual que ya hace con el pie
  // de página (número de página).
  let header;
  const imagenData = await cargarImagen('/logo.png');
  if (imagenData && imagenData.width > 0 && imagenData.height > 0) {
    const targetWidth = 100;
    const targetHeight = Math.round(targetWidth / (imagenData.width / imagenData.height));
    header = new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new ImageRun({ data: imagenData.data, transformation: { width: targetWidth, height: targetHeight }, type: 'png' })
          ]
        })
      ]
    });
  }

  // "Introducción": fundamento, secciones, proyecto de acuerdo, acuerdo.
  // "Proyecto": proyecto de acuerdo primero (sin el párrafo de fundamento),
  // luego secciones y acuerdo. Mismo orden que VistaPreviaFlotante.
  const fundamentoParrafo = new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 300 },
    children: [new TextRun({ text: INTRO_ACTA_TEXTO, size: 24, color: '000000', font: 'Arial' })]
  });

  const seccionesParrafos = [];
  bloquesActa.forEach(bloque => {
    if (!bloque.texto || !bloque.texto.trim()) return;
    const titulo = bloque.tipo === 'personalizada' ? (bloque.titulo || 'SECCIÓN') : (TITULOS_BLOQUE[bloque.tipo] || 'SECCIÓN');
    seccionesParrafos.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 160 },
      children: [new TextRun({ text: titulo, bold: true, size: 24, color: '000000', font: 'Arial' })]
    }));
    seccionesParrafos.push(...parrafosDeTexto(bloque.texto, { afterUltima: 300 }));
  });

  const contenidoLimpio = contenido.replace(/\*\*/g, '').replace(/_(.+?)_/g, '$1').replace(/%%(.+?)%%/g, '$1');
  const proyectoParrafo = contenidoLimpio.trim() ? new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 300 },
    children: [new TextRun({ text: contenidoLimpio.toUpperCase(), bold: true, size: 24, color: '000000', font: 'Arial' })]
  }) : null;

  const acuerdoParrafos = acuerdo.trim() ? parrafosDeTexto(acuerdo) : [];

  // Línea en blanco, frase puente y otra línea en blanco entre las secciones
  // y el proyecto de acuerdo (solo en "Introducción").
  const parrafoVacio = () => new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '', size: 24, font: 'Arial' })] });
  const puenteParrafos = [
    parrafoVacio(),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      children: [new TextRun({ text: PUENTE_ACTA_TEXTO, size: 24, color: '000000', font: 'Arial' })]
    }),
    parrafoVacio()
  ];

  const parrafos = [];
  if (plantilla === 'proyecto') {
    if (proyectoParrafo) parrafos.push(proyectoParrafo);
    parrafos.push(...seccionesParrafos);
    parrafos.push(...acuerdoParrafos);
  } else {
    parrafos.push(fundamentoParrafo);
    parrafos.push(...seccionesParrafos);
    parrafos.push(...puenteParrafos);
    if (proyectoParrafo) parrafos.push(proyectoParrafo);
    parrafos.push(...acuerdoParrafos);
  }

  if (parrafos.length === 0) return null;

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 20, color: '000000', font: 'Arial' })]
      })
    ]
  });

  const doc = new Document({
    sections: [{
      properties: {},
      headers: header ? { default: header } : undefined,
      footers: { default: footer },
      children: parrafos
    }]
  });
  const blob = await Packer.toBlob(doc);
  const fechaTexto = proyectoMeta.fecha ? ` ${proyectoMeta.fecha}` : '';
  return { blob, nombreArchivo: `Punto de acuerdo${fechaTexto}.docx` };
}
