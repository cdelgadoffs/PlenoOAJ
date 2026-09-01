import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } from 'docx';
import { parsearFechaLocal, getTituloPunto } from './fechas.js';
import { SECCIONES_DEL_DOCUMENTO } from './puntos.js';

// Sangría base (1 tabulador)
const SANGRIA_BASE = 720;
// Sangría para el número del punto (3 tabuladores)
const NUMERO_SANGRIA = 2160;
// Sangría para el texto del punto y títulos de sección (2 sangrías + 6 espacios)
const TEXTO_SANGRIA = 2520;
// Sangría para el bloque del título (4 tabuladores)
const SANGRIA_TITULO = 2880;

// Márgenes en twips (1 cm = 567 twips)
const MARGEN_SUPERIOR = 1559; // 2.75 cm
const MARGEN_IZQUIERDO = 1077; // 1.9 cm
const MARGEN_INFERIOR = 1440; // 2.54 cm
const MARGEN_DERECHO = 1440; // 2.54 cm

function limpiarAsteriscos(texto) {
  if (!texto) return texto;
  return texto.replace(/\*\*/g, '').replace(/\*/g, '');
}

// Función para añadir espacio entre caracteres y doble espacio entre palabras
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

  // Título de sesión base (sin espaciado)
  const tipoSesion = proyectoMeta.tipoSesion || '';
  const numeroSesion = proyectoMeta.numeroSesion || '';
  let tituloBase = 'PROYECTO DEL ORDEN DEL DÍA';
  if (tipoSesion && numeroSesion) {
    tituloBase = `SESIÓN ${tipoSesion.toUpperCase()} NÚMERO ${numeroSesion}`;
  }
  // Aplicar espaciado entre caracteres y doble espacio entre palabras
  const tituloConEspaciado = aplicarEspaciadoTexto(tituloBase);

  const parrafos = [];
  const interlineado115 = { line: 276, lineRule: 'auto' };

  // ---- Encabezados (con sangría de 4 tabuladores) ----
  // 1. Título de sesión (Arial 12, con espaciado, salto antes y después)
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

  // 2. "PROYECTO DE ORDEN DEL DÍA"
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

  // 3. "ÓRGANO DE ADMINISTRACIÓN JUDICIAL"
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

  // 4. Fecha con día de semana
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

  // ---- Cuerpo del documento ----
  let numeroGlobal = 1;

  SECCIONES_DEL_DOCUMENTO.forEach(nombreSeccion => {
    const puntosDeLaSeccion = secciones
      .map((sec, idx) => ({ sec, idx }))
      .filter(({ sec }) => sec.seccion === nombreSeccion);

    if (puntosDeLaSeccion.length === 0) return;

    // --- Lógica de omisión de títulos según sección ---
    if (nombreSeccion.toUpperCase() === 'APROBACIONES') {
      parrafos.push(
        new Paragraph({
          spacing: { before: 280, after: 140 }
        })
      );
    } else if (nombreSeccion.toUpperCase() === 'ASUNTOS GENERALES') {
      // Se omite completamente el título
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

    // --- Procesar los puntos de la sección ---
    puntosDeLaSeccion.forEach(({ sec }) => {
      let textoPunto = sec.contenido ? sec.contenido : getTituloPunto(sec, 0);
      textoPunto = limpiarAsteriscos(textoPunto);
      
      // Se ha eliminado la dependencia y el punto separador
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

      // Párrafo del punto con sangría francesa
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

  // ---- Pie de página (fecha actual) ----
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

  // ---- Generación del documento con márgenes personalizados ----
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
  const url = URL.createObjectURL(blob);
  const nombreArchivo = `Orden del dia - ${tituloBase}.docx`;
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}