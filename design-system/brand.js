/*
 * Nombre visible del producto para las vistas HTML locales (design system, mockups).
 * Para renombrar: cambiar BRAND_NAME acá; todo elemento con [data-brand-name] se actualiza solo.
 */
(function () {
  'use strict';
  var BRAND_NAME = 'Vitta Dental';

  function aplicar() {
    var nodos = document.querySelectorAll('[data-brand-name]');
    for (var i = 0; i < nodos.length; i++) nodos[i].textContent = BRAND_NAME;
  }

  window.BRAND_NAME = BRAND_NAME;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
  else aplicar();
})();
