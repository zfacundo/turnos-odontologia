/* Mockup de public/admin/js/tema.js (design D6): sincroniza aria-pressed, alterna y guarda la eleccion.
   Sin eleccion guardada sigue al sistema en vivo. Con ?tema= (comparar.html) no guarda nada. */
(function () {
  'use strict';
  var CLAVE = 'adm.tema';
  var raiz = document.documentElement;
  var forzado = /[?&]tema=(claro|oscuro)\b/.test(window.location.search);
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function leer() { try { var v = window.localStorage.getItem(CLAVE); return v === 'claro' || v === 'oscuro' ? v : null; } catch (e) { return null; } }
  function guardar(t) { if (forzado) return; try { window.localStorage.setItem(CLAVE, t); } catch (e) { /* solo en memoria */ } }
  var eleccion = forzado ? 'forzado' : leer();
  function aplicar(t) {
    raiz.setAttribute('data-tema', t);
    raiz.style.colorScheme = t === 'oscuro' ? 'dark' : 'light';
    document.querySelectorAll('[data-tema-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(t === 'oscuro')); });
  }
  aplicar(raiz.getAttribute('data-tema') === 'oscuro' ? 'oscuro' : 'claro');
  document.querySelectorAll('[data-tema-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = raiz.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
      eleccion = t; guardar(t); aplicar(t);
    });
  });
  if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { if (!eleccion) aplicar(e.matches ? 'oscuro' : 'claro'); });
})();
