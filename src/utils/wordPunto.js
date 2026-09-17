// Genera el .docx de un punto individual, reflejando el mismo contenido
// que se arma en VistaPreviaFlotante (logo, intro, bloques de acta, contenido y acuerdo).
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun } from 'docx';
import { cargarImagen } from './logoDocx.js';

export const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TITULOS_BLOQUE = {
  considerando: 'CONSIDERANDO',
  antecedente: 'ANTECEDENTES'
};

const INTRO_TEXTO = 'El Pleno del Órgano de Administración Judicial del Poder Judicial de la Federación, con fundamento en los artículos 94, párrafo segundo, 100, párrafos décimo segundo, décimo tercero y décimo octavo de la Constitución Política de los Estados Unidos Mexicanos; así como 1, fracción VIII, 70, 71, 78, 79, primer párrafo, 80, fracción II de la Ley Orgánica del Poder Judicial de la Federación; y,';

// Convierte una línea con marcadores **negrita** y %%oculto%% en TextRuns de docx.
// El texto oculto se muestra tal cual (documento interno de trabajo, no la versión pública).
function lineaARuns(linea) {
  const partes = linea.split(/(\*\*.+?\*\*|%%.+?%%)/g).filter(p => p !== '');
  if (partes.length === 0) return [new TextRun({ text: '', size: 24, color: '000000', font: 'Arial' })];
  return partes.map(parte => {
    const negrita = parte.match(/^\*\*(.+)\*\*$/);
    if (negrita) return new TextRun({ text: negrita[1], bold: true, size: 24, color: '000000', font: 'Arial' });
    const oculto = parte.match(/^%%(.+)%%$/);
    if (oculto) return new TextRun({ text: oculto[1], bold: false, size: 24, color: '000000', font: 'Arial' });
    return new TextRun({ text: parte, bold: false, size: 24, color: '000000', font: 'Arial' });
  });
}

function parrafosDeTexto(texto, opciones = {}) {
  const lineas = (texto || '').split('\n').filter(l => l.trim() !== '');
  return lineas.map((linea, i) => new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: i === lineas.length - 1 ? (opciones.afterUltima ?? 200) : 120 },
    children: lineaARuns(linea)
  }));
}

export async function generarWordPunto(punto, proyectoMeta = {}) {
  const { contenido = '', acuerdo = '', bloquesActa = [] } = punto;
  const parrafos = [];

  const imagenData = await cargarImagen('/logo.png');
  if (imagenData && imagenData.width > 0 && imagenData.height > 0) {
    const targetWidth = 140;
    const targetHeight = Math.round(targetWidth / (imagenData.width / imagenData.height));
    parrafos.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
      children: [
        new ImageRun({ data: imagenData.data, transformation: { width: targetWidth, height: targetHeight }, type: 'png' })
      ]
    }));
  }

  parrafos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 300 },
    children: [new TextRun({ text: INTRO_TEXTO, size: 24, color: '000000', font: 'Arial' })]
  }));

  bloquesActa.forEach(bloque => {
    if (!bloque.texto || !bloque.texto.trim()) return;
    const titulo = bloque.tipo === 'personalizada' ? (bloque.titulo || 'SECCIÓN') : (TITULOS_BLOQUE[bloque.tipo] || 'SECCIÓN');
    parrafos.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 160 },
      children: [new TextRun({ text: titulo, bold: true, size: 24, color: '000000', font: 'Arial' })]
    }));
    parrafos.push(...parrafosDeTexto(bloque.texto, { afterUltima: 300 }));
  });

  const contenidoLimpio = contenido.replace(/\*\*/g, '').replace(/%%(.+?)%%/g, '$1');
  if (contenidoLimpio.trim()) {
    parrafos.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 300 },
      children: [new TextRun({ text: contenidoLimpio.toUpperCase(), bold: true, size: 24, color: '000000', font: 'Arial' })]
    }));
  }

  if (acuerdo.trim()) {
    parrafos.push(...parrafosDeTexto(acuerdo));
  }

  if (parrafos.length === 0) return null;

  const doc = new Document({ sections: [{ properties: {}, children: parrafos }] });
  const blob = await Packer.toBlob(doc);
  const fechaTexto = proyectoMeta.fecha ? ` ${proyectoMeta.fecha}` : '';
  return { blob, nombreArchivo: `Punto de acuerdo${fechaTexto}.docx` };
}
