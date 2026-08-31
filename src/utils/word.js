import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } from 'docx';
import { parsearFechaLocal, getTituloPunto } from './fechas.js';
import { SECCIONES_DEL_DOCUMENTO } from './puntos.js';

const SANGRIA = { left: 720 };

function limpiarAsteriscos(texto) {
  if (!texto) return texto;
  return texto.replace(/\*\*/g, '').replace(/\*/g, '');
}

export async function generarWordOrdenDia(secciones, proyectoMeta) {
  if (secciones.length === 0) {
    alert('No hay puntos para generar el documento.');
    return;
  }

  // Fecha con día de semana
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

  // Título de sesión
  const tipoSesion = proyectoMeta.tipoSesion || '';
  const numeroSesion = proyectoMeta.numeroSesion || '';
  let tituloSesion = 'PROYECTO DEL ORDEN DEL DÍA';
  if (tipoSesion && numeroSesion) {
    tituloSesion = `SESIÓN ${tipoSesion.toUpperCase()} N° ${numeroSesion}`;
  }

  const parrafos = [];
  const interlineado115 = { line: 276, lineRule: 'auto' };

  // Encabezados
  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { ...interlineado115, after: 0 },
      children: [
        new TextRun({
          text: tituloSesion,
          bold: true,
          size: 32,
          color: '000000',
          font: 'Arial'
        })
      ]
    })
  );

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
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
      .filter(({ sec }) => sec.seccion === nombreSeccion);

    if (puntosDeLaSeccion.length === 0) return;

    // --- Lógica de omisión de títulos ---
    if (nombreSeccion.toUpperCase() === 'APROBACIONES') {
      // Conserva el salto (párrafo vacío con espaciado)
      parrafos.push(
        new Paragraph({
          spacing: { before: 280, after: 140 }
        })
      );
    } else if (nombreSeccion.toUpperCase() === 'ASUNTOS GENERALES') {
      // Omite completamente el título, sin salto de línea
      // No se agrega nada
    } else {
      // Título normal de sección
      parrafos.push(
        new Paragraph({
          indent: SANGRIA,
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

    // Procesar puntos de la sección (siempre se procesan)
    puntosDeLaSeccion.forEach(({ sec }) => {
      let textoPunto = sec.contenido ? sec.contenido : getTituloPunto(sec, 0);
      textoPunto = limpiarAsteriscos(textoPunto);
      
      const dependencia = sec.dependencia || '';
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

      if (dependencia) {
        childrenRuns.push(
          new TextRun({
            text: ` · ${dependencia}`,
            bold: true,
            size: 18, 
            color: '808080',
            font: 'Arial'
          })
        );
      }

      parrafos.push(
        new Paragraph({
          indent: { left: 720, hanging: 720 },
          tabs: [{ type: 'left', position: 720 }],
          spacing: { before: 160, after: 100 },
          alignment: AlignmentType.JUSTIFIED, // <--- ÚNICO CAMBIO: texto justificado
          children: childrenRuns
        })
      );

      numeroGlobal++;
    });
  });

  // Fecha del pie en negrita
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
    sections: [{ properties: {}, children: parrafos }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const nombreArchivo = `Orden del dia - ${tituloSesion}.docx`;
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}