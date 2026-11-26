/* Arranque del tema (design D5): script clásico y síncrono en <head>, ANTES de admin.css.
   Fija data-tema y color-scheme en <html> antes del primer pintado (sin destello).
   La regla de resolución duplica a js/tema-calculos.js; tests/panel/tema-arranque.test.ts exige paridad. */
(function () {
  'use strict';
  var guardado = null;
  try { guardado = window.localStorage.getItem('adm.tema'); } catch (e) { guardado = null; }
  var valido = guardado === 'claro' || guardado === 'oscuro';
  var prefiereOscuro = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var tema = valido ? guardado : (prefiereOscuro ? 'oscuro' : 'claro');
  var raiz = document.documentElement;
  raiz.setAttribute('data-tema', tema);
  raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
})();
