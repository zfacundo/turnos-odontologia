/* Mockup: comportamiento mínimo del shell (menú mobile y drawer). Sin datos reales. */
(function () {
  'use strict';
  var btn = document.querySelector('.menu-btn');
  var side = document.querySelector('.sidebar');
  if (btn && side) {
    btn.addEventListener('click', function () {
      var abierto = side.getAttribute('data-open') === 'true';
      side.setAttribute('data-open', String(!abierto));
      btn.setAttribute('aria-expanded', String(!abierto));
      if (!abierto) { var a = side.querySelector('a'); if (a) a.focus(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && side.getAttribute('data-open') === 'true') {
        side.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }
})();
