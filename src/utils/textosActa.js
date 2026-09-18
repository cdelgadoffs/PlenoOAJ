// Texto fijo del párrafo de fundamento ("El Pleno del Órgano...") que abre
// el acta en la plantilla "Introducción". Se centraliza aquí porque se usa
// tanto en el visor flotante (VistaPreviaFlotante, con la primera parte en
// negrita) como en el generador de Word (wordPunto.js), y antes vivía
// duplicado en ambos archivos con riesgo de que se desincronizaran.
export const INTRO_ACTA_NOMBRE = 'El Pleno del Órgano de Administración Judicial del Poder Judicial de la Federación';
export const INTRO_ACTA_RESTO = ', con fundamento en los artículos 94, párrafo segundo, 100, párrafos décimo segundo, décimo tercero y décimo octavo de la Constitución Política de los Estados Unidos Mexicanos; 1, fracción VIII, 70, 71, 78, 79, 80, fracciones II y XI de la Ley Orgánica del Poder Judicial de la Federación; y.';
export const INTRO_ACTA_TEXTO = INTRO_ACTA_NOMBRE + INTRO_ACTA_RESTO;

// Frase puente de la plantilla "Introducción": va después de las secciones
// (considerandos/antecedentes) y antes del proyecto de punto de acuerdo,
// separada de ambos por una línea en blanco a cada lado.
export const PUENTE_ACTA_TEXTO = 'Por lo anterior, se emite el siguiente:';
