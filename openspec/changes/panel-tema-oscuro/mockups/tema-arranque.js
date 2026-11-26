/* Mockup de public/admin/tema-arranque.js (design D5): script clasico y sincrono en <head>, antes del CSS.
   Solo en el mockup: ?tema=claro|oscuro fuerza el tema (lo usa comparar.html) y no se guarda. */
(function () {
  'use strict';
  var CLAVE = 'adm.tema';
  var guardado = null;
  try { guardado = window.localStorage.getItem(CLAVE); } catch (e) { guardado = null; }
  var forzado = /[?&]tema=(claro|oscuro)\b/.exec(window.location.search);
  if (forzado) guardado = forzado[1];
  var valido = guardado === 'claro' || guardado === 'oscuro';
  var prefiereOscuro = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var tema = valido ? guardado : (prefiereOscuro ? 'oscuro' : 'claro');
  var raiz = document.documentElement;
  raiz.setAttribute('data-tema', tema);
  raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
})();
