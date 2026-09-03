import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun } from 'docx';
import { parsearFechaLocal, padNumber } from './fechas.js';
import { SECCIONES_DEL_DOCUMENTO } from './puntos.js';

function limpiarAsteriscos(texto) {
  if (!texto) return texto;
  return texto.replace(/\*\*/g, '').replace(/\*/g, '');
}

async function obtenerImagenBase64(url) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('No se pudo descargar la imagen');
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('El recurso no es una imagen');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('No se pudo cargar la imagen:', error);
    return null;
  }
}

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

export async function generarWordActa(secciones, proyectoMeta, asistentes = [], sesionData = {}) {
  if (secciones.length === 0) {
    alert('No hay puntos para generar el acta.');
    return;
  }

  const fechaObj = proyectoMeta.fecha ? parsearFechaLocal(proyectoMeta.fecha) : new Date();
  const diaSemana = fechaObj.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
  const anio = fechaObj.getFullYear();
  const fechaConDia = `${diaSemana} ${dia} DE ${mes} DE ${anio}`;

  const tipoSesion = proyectoMeta.tipoSesion || '';
  const numeroSesion = proyectoMeta.numeroSesion || '';
  const tituloSesion = tipoSesion && numeroSesion
    ? `SESIÓN ${tipoSesion.toUpperCase()} N° ${numeroSesion}`
    : 'ACTA DE SESIÓN';

  const parrafos = [];
  const interlineado115 = { line: 276, lineRule: 'auto' };

  // ========== LOGO ==========
  const imagenBase64 = await obtenerImagenBase64('https://raw.githubusercontent.com/cdelgadoffs/CGD/d91c7a41d1778d4641ffbd603cbba2c9adce53e5/logovert.png');
  if (imagenBase64) {
    parrafos.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
      children: [
        new ImageRun({
          data: imagenBase64,
          transformation: { width: 120, height: 120 },
          type: 'png',
        }),
      ],
    }));
  }

  // ========== TÍTULO ==========
  const tituloTexto = `ACTA DE LA ${tituloSesion} DEL PLENO DEL ÓRGANO DE ADMINISTRACIÓN JUDICIAL CORRESPONDIENTE AL DÍA ${fechaConDia}`;
  parrafos.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { ...interlineado115, after: 280 },
    children: [
      new TextRun({
        text: tituloTexto,
        bold: true,
        size: 24,
        color: '000000',
        font: 'Arial',
      }),
    ],
  }));

  // ========== TEXTO INTRODUCTORIO ==========
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

  const textoIntro = `En la Ciudad de México, siendo las ${horaInicio} horas del ${fechaConDia.toLowerCase()}, se reúnen de manera presencial en el salón del Pleno del Órgano de Administración Judicial para celebrar la sesión ${tipoSesion.toLowerCase()} convocada por las y los integrantes: ${nombresAsistentes || '<<integrantes>>'}; con lo cual se da cuenta sobre la adopción de las siguientes determinaciones:`;

  parrafos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { ...interlineado115, before: 0, after: 300 },
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

  SECCIONES_DEL_DOCUMENTO.forEach(nombreSeccion => {
    const puntosDeLaSeccion = secciones.filter(sec => sec.seccion === nombreSeccion);
    if (puntosDeLaSeccion.length === 0) return;

    if (nombreSeccion.toUpperCase() === 'APROBACIONES') {
      parrafos.push(new Paragraph({ spacing: { before: 280, after: 140 } }));
    } else if (nombreSeccion.toUpperCase() !== 'ASUNTOS GENERALES') {
      parrafos.push(new Paragraph({
        indent: { left: 720 },
        spacing: { before: 280, after: 140 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: nombreSeccion.toUpperCase(), bold: true, size: 24, color: '000000', font: 'Arial' })],
      }));
    }

    puntosDeLaSeccion.forEach(sec => {
      const identificador = `${numeroGlobal}. PLE./${padNumber(numeroGlobal, 3)}.- `;
      const contenido = limpiarAsteriscos(sec.contenido) || '';
      const acuerdo = limpiarAsteriscos(sec.acuerdo) || '';

      const lineasAcuerdo = acuerdo.split('\n').filter(l => l.trim() !== '');
      const esAcuerdoUnico = lineasAcuerdo.length === 1 && /^ÚNICO\.?\s*/i.test(lineasAcuerdo[0].trim());

      const votacion = generarTextoVotacion(sec, asistentes);
      const tieneVotacion = !!votacion;
      const tieneAcuerdo = !!acuerdo && !esAcuerdoUnico;

      // 1. Punto de acuerdo (contenido)
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

      // 3. Acuerdo (solo si no es único, cursiva)
      if (tieneAcuerdo) {
        lineasAcuerdo.forEach((linea, i) => {
          parrafos.push(new Paragraph({
            indent: { left: 720 },
            spacing: { before: 0, after: i === lineasAcuerdo.length - 1 ? 280 : 120 },
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: limpiarAsteriscos(linea), italics: true, size: 22, color: '000000', font: 'Arial' })],
          }));
        });
      }

      numeroGlobal++;
    });
  });

  // ========== PIE DE PÁGINA ==========
  const hoy = new Date();
  const fechaFooter = `${String(hoy.getDate()).padStart(2, '0')} DE ${hoy.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()} DE ${hoy.getFullYear()}`;
  parrafos.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    children: [new TextRun({ text: fechaFooter, bold: true, size: 24, color: '000000', font: 'Arial' })],
  }));

  // ========== GENERACIÓN ==========
  const doc = new Document({ sections: [{ properties: {}, children: parrafos }] });
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