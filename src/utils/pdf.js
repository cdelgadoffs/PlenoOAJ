import { parsearFechaLocal, getTituloPunto } from './fechas.js';
import { ocultarParaActa } from './texto.js';
function escaparHtml(texto) {
  return (texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function contenidoParaActa(texto) {
  return ocultarParaActa(escaparHtml(texto || ''));
}
export function generarPDFConPrint(secciones, proyectoMeta) {
  if (secciones.length === 0) {
    alert('No hay puntos para generar el PDF.');
    return;
  }
  const old = document.querySelector('.print-content');
  if (old) old.remove();

  const printContainer = document.createElement('div');
  printContainer.className = 'print-content';

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

  let html = `
    <div class="doc-header">
      <img class="logo-print"
           src="https://raw.githubusercontent.com/cdelgadoffs/CGD/d91c7a41d1778d4641ffbd603cbba2c9adce53e5/logovert.png"
           alt="Logo" />
      <div class="doc-header-texto">
        <div class="doc-type">PROYECTO DE ORDEN DEL DÍA</div>
        <div class="doc-title">${tituloPrincipal}</div>
        <div class="doc-sub">${subtitulo}</div>
      </div>
    </div>
  `;

  secciones.forEach((sec, idxGlobal) => {
    const titulo = getTituloPunto(sec, idxGlobal);
    const dependencia = sec.dependencia || 'Pleno';
    const metaPartes = [dependencia, sec.seccion].filter(Boolean);
    if (sec.voto && sec.voto !== 'Pendiente') metaPartes.push(sec.voto);
    html += `
      <div class="punto-print">
        <div class="numero">${titulo}</div>
        <div class="meta">${metaPartes.join(' · ')}</div>
        <div class="contenido">${sec.contenido ? contenidoParaActa(sec.contenido) : 'Sin contenido'}</div>
      </div>
    `;
  });

  html += `<div class="footer-print"> ${new Date().toLocaleDateString()}</div>`;
  printContainer.innerHTML = html;
  document.body.appendChild(printContainer);

  printContainer.offsetHeight;

  const logoImg = printContainer.querySelector('.logo-print');
  let impresionLanzada = false;
  let timeoutSalvaguarda = null;

  const lanzarImpresion = () => {
    if (impresionLanzada) return;
    impresionLanzada = true;
    if (timeoutSalvaguarda) clearTimeout(timeoutSalvaguarda);
    window.print();
    setTimeout(() => printContainer.remove(), 1000);
  };

  if (logoImg && !logoImg.complete) {
    logoImg.addEventListener('load', lanzarImpresion, { once: true });
    logoImg.addEventListener('error', lanzarImpresion, { once: true });
    timeoutSalvaguarda = setTimeout(lanzarImpresion, 2500);
  } else {
    lanzarImpresion();
  }
}
