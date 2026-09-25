import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } from 'docx';
import { parsearFechaLocal, getTituloPunto } from './fechas.js';
import { SECCIONES_DEL_DOCUMENTO } from './puntos.js';
import { limpiarMarcadores } from './texto.js';

const SANGRIA_BASE = 720;
const NUMERO_SANGRIA = 2160;
const TEXTO_SANGRIA = 2520;
const SANGRIA_TITULO = 2880;

const MARGEN_SUPERIOR = 1559;
const MARGEN_IZQUIERDO = 1077;
const MARGEN_INFERIOR = 1440;
const MARGEN_DERECHO = 1440;

function limpiarAsteriscos(texto) {
  if (!texto) return texto;
  return limpiarMarcadores(texto).replace(/\*/g, '').replace(/%%(.+?)%%/g, '$1');
}

function aplicarEspaciadoTexto(texto) {
  const palabras = texto.split(' ');
  const palabrasSeparadas = palabras.map(palabra => palabra.split('').join(' '));
  return palabrasSeparadas.join('  ');
}

export async function generarWordOrdenDia(secciones, proyectoMeta) {
  if (secciones.length === 0) {
    alert('No hay puntos para generar el documento.');
    return;
  }

  let fechaObj;
  if (proyectoMeta.fecha) {
    fechaObj = parsearFechaLocal(proyectoMeta.fecha);
  } else {
    fechaObj = new Date();
  }
  const diaSemana = fechaObj.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
  const anio = fechaObj.getFullYear();
  const fechaConDia = `${diaSemana} ${dia} DE ${mes} DE ${anio}`;

  const tipoSesion = proyectoMeta.tipoSesion || '';
  const numeroSesion = proyectoMeta.numeroSesion || '';
  let tituloBase = 'PROYECTO DEL ORDEN DEL DÍA';
  if (tipoSesion && numeroSesion) {
    tituloBase = `SESIÓN ${tipoSesion.toUpperCase()} NÚMERO ${numeroSesion}`;
  }
  const tituloConEspaciado = aplicarEspaciadoTexto(tituloBase);

  const parrafos = [];
  const interlineado115 = { line: 276, lineRule: 'auto' };

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { left: SANGRIA_TITULO },
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: tituloConEspaciado,
          bold: true,
          size: 24,
          color: '000000',
          font: 'Arial'
        })
      ]
    })
  );

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { left: SANGRIA_TITULO },
      spacing: { ...interlineado115, after: 0 },
      children: [
        new TextRun({
          text: 'PROYECTO DE ORDEN DEL DÍA',
          bold: true,
          size: 24,
          color: '000000',
          font: 'Arial',
          underline: { type: UnderlineType.SINGLE }
        })
      ]
    })
  );

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { left: SANGRIA_TITULO },
      spacing: { ...interlineado115, after: 0 },
      children: [
        new TextRun({
          text: 'ÓRGANO DE ADMINISTRACIÓN JUDICIAL',
          bold: true,
          size: 24,
          color: '000000',
          font: 'Arial',
          underline: { type: UnderlineType.SINGLE }
        })
      ]
    })
  );

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      indent: { left: SANGRIA_TITULO },
      spacing: { ...interlineado115, after: 300 },
      children: [
        new TextRun({
          text: fechaConDia,
          bold: true,
          size: 24,
          color: '000000',
          font: 'Arial',
          underline: { type: UnderlineType.SINGLE }
        })
      ]
    })
  );

  let numeroGlobal = 1;

  SECCIONES_DEL_DOCUMENTO.forEach(nombreSeccion => {
    const puntosDeLaSeccion = secciones
      .map((sec, idx) => ({ sec, idx }))
      .filter(({ sec }) => sec.seccion === nombreSeccion)

    if (puntosDeLaSeccion.length === 0) return;

    if (nombreSeccion.toUpperCase() === 'APROBACIONES') {
      parrafos.push(
        new Paragraph({
          spacing: { before: 280, after: 140 }
        })
      );
    } else if (nombreSeccion.toUpperCase() === 'ASUNTOS GENERALES') {
    } else {
      parrafos.push(
        new Paragraph({
          indent: { left: TEXTO_SANGRIA },
          spacing: { before: 280, after: 140 },
          children: [
            new TextRun({
              text: nombreSeccion.toUpperCase(),
              bold: true,
              size: 24,
              color: '000000',
              font: 'Arial'
            })
          ]
        })
      );
    }

    puntosDeLaSeccion.forEach(({ sec }) => {
      let textoPunto = sec.confidencial
        ? 'CONFIDENCIAL'
        : (sec.contenido ? sec.contenido : getTituloPunto(sec, 0));
      textoPunto = limpiarAsteriscos(textoPunto);

      const childrenRuns = [
        new TextRun({
          text: `${numeroGlobal}.\t`,
          bold: false,
          size: 24,
          color: '000000',
          font: 'Arial'
        }),
        new TextRun({
          text: textoPunto,
          bold: false,
          size: 24,
          color: '000000',
          font: 'Arial'
        })
      ];

      parrafos.push(
        new Paragraph({
          indent: {
            left: TEXTO_SANGRIA,
            hanging: TEXTO_SANGRIA - NUMERO_SANGRIA
          },
          tabs: [{ type: 'left', position: TEXTO_SANGRIA }],
          spacing: { before: 160, after: 100 },
          alignment: AlignmentType.JUSTIFIED,
          children: childrenRuns
        })
      );

      numeroGlobal++;
    });
  });

  const hoy = new Date();
  const diaPie = String(hoy.getDate()).padStart(2, '0');
  const mesPie = hoy.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
  const anioPie = hoy.getFullYear();
  const fechaFooter = `${diaPie} DE ${mesPie} DE ${anioPie}`;

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: fechaFooter,
          bold: true,
          size: 24,
          color: '000000',
          font: 'Arial'
        })
      ]
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: MARGEN_SUPERIOR,
            left: MARGEN_IZQUIERDO,
            bottom: MARGEN_INFERIOR,
            right: MARGEN_DERECHO,
          }
        }
      },
      children: parrafos
    }]
  });

  const blob = await Packer.toBlob(doc);
  return { blob, nombreArchivo: `Orden del dia - ${tituloBase}.docx` };
}
