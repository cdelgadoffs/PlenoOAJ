import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { parsearFechaLocal, getTituloPunto } from './fechas.js';
import { ocultarParaActa } from './texto.js';
import { SECCIONES_DEL_DOCUMENTO } from './puntos.js';

const SANGRIA = { left: 720 };

export async function generarWordOrdenDia(secciones, proyectoMeta) {
  if (secciones.length === 0) {
    alert('No hay puntos para generar el documento.');
    return;
  }

  let fechaMostrada;
  if (proyectoMeta.fecha) {
    const fechaObj = parsearFechaLocal(proyectoMeta.fecha);
    fechaMostrada = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  } else {
    fechaMostrada = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const tipoSesion = proyectoMeta.tipoSesion || '';
  const numeroSesion = proyectoMeta.numeroSesion || '';
  let tituloPrincipal = 'Proyecto del orden del día';
  if (tipoSesion && numeroSesion) tituloPrincipal = `Sesión ${tipoSesion} N° ${numeroSesion}`;

  let subtitulo = fechaMostrada;
  if (!proyectoMeta.tipoSesion || !proyectoMeta.numeroSesion) subtitulo += ' · ÓRGANO DE ADMINISTRACIÓN JUDICIAL';

  const parrafos = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'PROYECTO DE ORDEN DEL DÍA', bold: true, size: 18, color: '000000', font: 'Arial' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: tituloPrincipal, bold: true, size: 30, color: '000000', font: 'Arial' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: subtitulo, size: 19, color: '000000', font: 'Arial' })]
    })
  ];

  SECCIONES_DEL_DOCUMENTO.forEach(nombreSeccion => {
    const puntosDeLaSeccion = secciones
      .map((sec, idxGlobal) => ({ sec, idxGlobal }))
      .filter(({ sec }) => sec.seccion === nombreSeccion);

    if (puntosDeLaSeccion.length === 0) return;

    const nombreVisible = nombreSeccion.charAt(0).toUpperCase() + nombreSeccion.slice(1);
    parrafos.push(
      new Paragraph({
        spacing: { before: 280, after: 140 },
        children: [new TextRun({ text: nombreVisible, bold: true, size: 26, color: '000000', font: 'Arial' })]
      })
    );

    puntosDeLaSeccion.forEach(({ sec, idxGlobal }) => {
      const titulo = getTituloPunto(sec, idxGlobal);
      const dependencia = sec.dependencia || 'Pleno';
      const contenido = sec.contenido ? ocultarParaActa(sec.contenido) : 'Sin contenido';

      parrafos.push(
        new Paragraph({
          indent: SANGRIA,
          spacing: { before: 160, after: 40 },
          children: [
            new TextRun({ text: titulo, bold: true, size: 22, color: '000000', font: 'Arial' }),
            new TextRun({ text: '   ·   ' + dependencia, bold: false, size: 20, color: '000000', font: 'Arial' })
          ]
        }),
        new Paragraph({
          indent: SANGRIA,
          spacing: { after: 100 },
          children: [new TextRun({ text: contenido, size: 24, color: '000000', font: 'Arial' })]
        })
      );
    });
  });

  const hoy = new Date();
  const fechaFooter = [
    String(hoy.getDate()).padStart(2, '0'),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    hoy.getFullYear()
  ].join('/');

  parrafos.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [new TextRun({ text: fechaFooter, size: 21, color: '000000', font: 'Arial' })]
    })
  );

  const doc = new Document({
    sections: [{ properties: {}, children: parrafos }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const nombreArchivo = `Orden del dia - ${tituloPrincipal}.docx`;
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}