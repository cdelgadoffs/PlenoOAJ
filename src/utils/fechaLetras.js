import { parsearFechaLocal } from './fechas.js';

export function numeroALetras(num) {
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

export function corregirAcentosFecha(texto) {
  return texto
    .replace(/VEINTISEIS/g, 'VEINTISÉIS')
    .replace(/veintiseis/g, 'veintiséis');
}

export function convertirNumeroALetras(num) {
  let texto = numeroALetras(num);
  texto = corregirAcentosFecha(texto);
  return texto.toUpperCase();
}

export function fechaEnLetras(fechaISO) {
  if (!fechaISO) return '';
  const fechaObj = parsearFechaLocal(fechaISO);
  if (!fechaObj) return '';
  const diaLetras = convertirNumeroALetras(fechaObj.getDate());
  const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' });
  const anioLetras = convertirNumeroALetras(fechaObj.getFullYear());
  return corregirAcentosFecha(`${diaLetras} de ${mes} de ${anioLetras}`.toLowerCase());
}
