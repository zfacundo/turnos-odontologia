/* Chat del bot de WhatsApp SIMULADO (C-06). Habla solo con la API local /api/sim/whatsapp/. */
(function () {
  'use strict';

  var selTelefono = document.getElementById('telefono');
  var cabecera = document.getElementById('cabecera');
  var lista = document.getElementById('mensajes');
  var opciones = document.getElementById('opciones');
  var form = document.getElementById('form');
  var inputTexto = document.getElementById('texto');
  var btnEnviar = document.getElementById('enviar');
  var btnRecordatorio = document.getElementById('recordatorio');
  var pideTexto = true; // al empezar, el paciente escribe el primer mensaje

  function hora() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function burbuja(clase, texto, tarjeta) {
    var div = document.createElement('div');
    div.className = 'b ' + clase;
    if (tarjeta) {
      div.classList.add('card-msg');
      var titulo = document.createElement('strong');
      titulo.textContent = tarjeta.titulo;
      div.appendChild(titulo);
      div.appendChild(document.createTextNode(tarjeta.lineas.join('\n')));
    } else {
      div.textContent = texto;
    }
    var t = document.createElement('time');
    t.textContent = hora();
    div.appendChild(t);
    lista.appendChild(div);
    lista.scrollTop = lista.scrollHeight;
  }

  function separador(texto) {
    var div = document.createElement('div');
    div.className = 'divider';
    div.textContent = texto;
    lista.appendChild(div);
  }

  var ALERTAS = /ya se ocupó|Ya tenés otro turno|menos de 24 h|No pude|rechazado \(simulación\)|falla simulada|No encontré el afiliado/;
  var PELIGRO = ['cancelar', 'rechazar-pago'];

  function mostrar(respuesta) {
    respuesta.mensajes.forEach(function (m) {
      if (m.tarjeta) {
        burbuja('bot', '', m.tarjeta);
      } else {
        burbuja(ALERTAS.test(m.texto) ? 'bot alerta' : 'bot', m.texto);
      }
    });
    opciones.innerHTML = '';
    respuesta.opciones.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = PELIGRO.indexOf(o.id) >= 0 ? 'chip danger' : 'chip';
      b.textContent = o.etiqueta;
      b.addEventListener('click', function () {
        burbuja('me', o.etiqueta);
        enviar({ opcionId: o.id });
      });
      opciones.appendChild(b);
    });
    pideTexto = respuesta.pideTexto || respuesta.opciones.length === 0;
    actualizarEntrada();
    var primero = opciones.querySelector('button');
    if (primero) primero.focus();
    else if (pideTexto) inputTexto.focus();
  }

  function actualizarEntrada() {
    inputTexto.disabled = !pideTexto;
    btnEnviar.disabled = !pideTexto;
    inputTexto.placeholder = pideTexto ? 'Escribí un mensaje' : 'Elegí una opción';
  }

  function bloquear(si) {
    Array.prototype.forEach.call(opciones.querySelectorAll('button'), function (b) { b.disabled = si; });
    btnRecordatorio.disabled = si;
    if (si) { inputTexto.disabled = true; btnEnviar.disabled = true; } else { actualizarEntrada(); }
  }

  function opcionesPost(cuerpo) {
    return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) };
  }

  /** `llamada` devuelve el fetch a una ruta literal del simulador (sin URLs armadas ni externas). */
  function pedir(llamada) {
    bloquear(true);
    return llamada()
      .then(function (res) {
        return res.json().then(function (json) {
          if (!res.ok) throw new Error((json.error && json.error.mensaje) || 'Error ' + res.status);
          return json;
        });
      })
      .then(function (json) {
        bloquear(false);
        mostrar(json);
      })
      .catch(function (err) {
        bloquear(false);
        burbuja('bot alerta', 'No pude enviar el mensaje: ' + err.message);
      });
  }

  function enviar(extra) {
    var cuerpo = { telefono: selTelefono.value };
    Object.keys(extra).forEach(function (k) { cuerpo[k] = extra[k]; });
    return pedir(function () { return fetch('/api/sim/whatsapp/mensaje', opcionesPost(cuerpo)); });
  }

  var avisosVistos = new Set();

  function consultarAvisos() {
    var telefono = selTelefono.value;

    fetch('/api/sim/whatsapp/avisos?telefono=' +
      encodeURIComponent(telefono))
      .then(function (res) {
        if (!res.ok) throw new Error('No se pudieron consultar avisos');
        return res.json();
      })
      .then(function (datos) {
        if (selTelefono.value !== telefono) return;

        datos.avisos.forEach(function (aviso) {
          if (!avisosVistos.has(aviso.id)) {
            avisosVistos.add(aviso.id);
            burbuja('bot', aviso.texto);
          }
        });
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  function reiniciar() {
    lista.innerHTML = '';
    opciones.innerHTML = '';
    cabecera.textContent = 'Consultorio (TBD) · ' + selTelefono.value;
    pideTexto = true;
    actualizarEntrada();
    inputTexto.value = 'Hola! Quería sacar un turno';
    avisosVistos.clear();
    consultarAvisos();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var texto = inputTexto.value.trim();
    if (!texto || !pideTexto) return;
    burbuja('me', texto);
    inputTexto.value = '';
    enviar({ texto: texto });
  });

  btnRecordatorio.addEventListener('click', function () {
    separador('24 h antes del turno · el bot escribe solo (demo)');
    var cuerpo = { telefono: selTelefono.value };
    pedir(function () { return fetch('/api/sim/whatsapp/recordatorio', opcionesPost(cuerpo)); });
  });

  selTelefono.addEventListener('change', reiniciar);
  reiniciar();
  setInterval(consultarAvisos, 3000);
})();
