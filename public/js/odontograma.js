
const CUADRANTES = {
  1: [18, 17, 16, 15, 14, 13, 12, 11],
  2: [21, 22, 23, 24, 25, 26, 27, 28],
  3: [31, 32, 33, 34, 35, 36, 37, 38],
  4: [48, 47, 46, 45, 44, 43, 42, 41]
};

const TIPOS = [
  'Incisivo central',
  'Incisivo lateral',
  'Canino',
  'Primer premolar',
  'Segundo premolar',
  'Primer molar',
  'Segundo molar',
  'Tercer molar'
];

const UBICACIONES = {
  1: 'superior derecho',
  2: 'superior izquierdo',
  3: 'inferior izquierdo',
  4: 'inferior derecho'
};

const $ = id => document.getElementById(id);

let piezaActual = null;
let carasActuales = new Set();
let piezasGuardadas = new Map();

function avisar(texto, tipo = '') {
  $('mensaje').textContent = texto;
  $('mensaje').className = 'mensaje ' + tipo;
}

function nombrePieza(numero) {
  const cuadrante = Math.floor(numero / 10);
  const posicion = numero % 10;

  return `${numero} · ${TIPOS[posicion - 1]} ` +
    UBICACIONES[cuadrante];
}

function obtenerTurnoId() {
  return $('turno-id').value;
}

function configurarRol() {
  const rol = $('rol').value;

  localStorage.setItem('rol', rol);
  localStorage.setItem('usuario', 'u-' + rol);
}

// ---------- Dibujar las 32 piezas ----------

function dibujarOdontograma() {
  for (const [cuadrante, numeros] of Object.entries(CUADRANTES)) {
    const contenedor = $('cuadrante-' + cuadrante);
    contenedor.replaceChildren();

    for (const numero of numeros) {
      const boton = document.createElement('button');
      const guardada = piezasGuardadas.get(numero);

      boton.type = 'button';
      boton.className = 'diente';

      if (guardada) {
        boton.classList.add(guardada.estado);
      }

      if (piezaActual === numero) {
        boton.classList.add('seleccionado');
      }

      boton.setAttribute('aria-label', nombrePieza(numero));
      boton.title = nombrePieza(numero);

      const forma = document.createElement('span');
      forma.className = 'forma';

      const etiqueta = document.createElement('strong');
      etiqueta.textContent = String(numero);

      boton.append(forma, etiqueta);

      boton.addEventListener('click', () => {
        seleccionarPieza(numero);
      });

      contenedor.appendChild(boton);
    }
  }
}

// ---------- Selección de una pieza ----------

function seleccionarPieza(numero) {
  piezaActual = numero;
  carasActuales = new Set();

  const guardada = piezasGuardadas.get(numero);

  if (guardada) {
    carasActuales = new Set(guardada.caras ?? []);
  }

  $('detalle').hidden = false;
  $('pieza-seleccionada').textContent = nombrePieza(numero);

  for (const boton of document.querySelectorAll('[data-cara]')) {
    const activa = carasActuales.has(boton.dataset.cara);

    boton.classList.toggle('activa', activa);
    boton.setAttribute('aria-pressed', String(activa));
  }

  for (const checkbox of document.querySelectorAll(
    'input[name="sintoma"]'
  )) {
    checkbox.checked = guardada?.sintomas.includes(checkbox.value)
      ?? false;
  }

  const hecho = guardada?.estado === 'hecho';

  $('guardar').disabled = hecho;
  $('guardar').textContent = hecho
    ? 'Pieza ya realizada'
    : `Agregar pieza ${numero} al turno`;

  const puedeMarcar =
    $('rol').value === 'odontologo' &&
    guardada !== undefined &&
    !hecho;

  $('marcar-hecho').hidden = !puedeMarcar;

  dibujarOdontograma();
}

for (const boton of document.querySelectorAll('[data-cara]')) {
  boton.addEventListener('click', () => {
    const cara = boton.dataset.cara;

    if (carasActuales.has(cara)) {
      carasActuales.delete(cara);
    } else {
      carasActuales.add(cara);
    }

    const activa = carasActuales.has(cara);

    boton.classList.toggle('activa', activa);
    boton.setAttribute('aria-pressed', String(activa));
  });
}

// ---------- Mostrar piezas guardadas ----------

function mostrarLista() {
  const lista = $('lista-piezas');
  lista.replaceChildren();

  if (piezasGuardadas.size === 0) {
    const item = document.createElement('li');
    item.textContent = 'Todavía no hay piezas marcadas.';
    lista.appendChild(item);
    return;
  }

  for (const pieza of [...piezasGuardadas.values()]
    .sort((a, b) => a.pieza - b.pieza)) {

    const item = document.createElement('li');
    const boton = document.createElement('button');

    boton.type = 'button';
    boton.textContent =
      `${pieza.pieza} · ${pieza.estado === 'hecho'
        ? 'Hecho'
        : 'A revisar'}`;

    boton.addEventListener('click', () => {
      seleccionarPieza(pieza.pieza);
    });

    item.appendChild(boton);
    lista.appendChild(item);
  }
}

// ---------- Consultar turnos ----------

async function cargarTurnos() {
  const respuesta = await api('/turnos');

  if (!respuesta.ok || !Array.isArray(respuesta.data?.turnos)) {
    throw new Error('No se pudieron consultar los turnos.');
  }

  const selector = $('turno-id');
  const anterior = selector.value;
  selector.replaceChildren();

  for (const turno of respuesta.data.turnos) {
    const fecha = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(turno.inicio));

    const etiqueta = `${turno.pacienteId} · ${fecha}`;

    selector.add(new Option(etiqueta, turno.id));
  }

  if ([...selector.options].some(o => o.value === anterior)) {
    selector.value = anterior;
  }

  if (!selector.options.length) {
    selector.add(new Option('No hay turnos registrados', ''));
    avisar('Primero necesitás crear un turno de prueba.', 'error');
  }
}

// ---------- Consultar odontograma guardado ----------

async function cargarPiezas() {
  piezasGuardadas.clear();
  piezaActual = null;
  $('detalle').hidden = true;
  $('pieza-seleccionada').textContent =
    'Seleccioná un diente del odontograma.';

  const turnoId = obtenerTurnoId();

  if (!turnoId) {
    dibujarOdontograma();
    mostrarLista();
    return;
  }

  try {
    const respuesta = await api(
      `/turnos/${encodeURIComponent(turnoId)}/piezas`
    );

    if (!respuesta.ok) {
      throw new Error(
        respuesta.data?.error?.mensaje ||
        'No se pudieron consultar las piezas.'
      );
    }

    for (const pieza of respuesta.data.piezas) {
      piezasGuardadas.set(pieza.pieza, pieza);
    }

    avisar('Odontograma cargado correctamente.');

  } catch (error) {
    avisar(error.message, 'error');
  }

  dibujarOdontograma();
  mostrarLista();
}

// ---------- Guardar pieza ----------

async function guardarPieza() {
  const turnoId = obtenerTurnoId();

  if (!turnoId || piezaActual === null) {
    avisar('Seleccioná un turno y una pieza.', 'error');
    return;
  }

  const sintomas = [
    ...document.querySelectorAll('input[name="sintoma"]:checked')
  ].map(input => input.value);

  if (sintomas.length === 0) {
    avisar('Seleccioná al menos un síntoma.', 'error');
    return;
  }

  const numero = piezaActual;
  const boton = $('guardar');
  boton.disabled = true;

  try {
    const respuesta = await api(
      `/turnos/${encodeURIComponent(turnoId)}/piezas`,
      {
        method: 'PUT',
        body: {
          pieza: numero,
          caras: [...carasActuales],
          sintomas
        }
      }
    );

    if (!respuesta.ok) {
      throw new Error(
        respuesta.data?.error?.mensaje ||
        'No se pudo guardar la pieza.'
      );
    }

    piezasGuardadas.set(numero, respuesta.data);

    mostrarLista();
    seleccionarPieza(numero);

    avisar(
      `Pieza ${numero} agregada al turno correctamente.`,
      'exito'
    );

  } catch (error) {
    avisar(error.message, 'error');
  } finally {
    if (piezasGuardadas.get(numero)?.estado !== 'hecho') {
      boton.disabled = false;
    }
  }
}

// ---------- Marcar como realizado ----------

async function marcarPiezaHecha() {
  const turnoId = obtenerTurnoId();

  if (!turnoId || piezaActual === null) return;

  const numero = piezaActual;

  try {
    const respuesta = await api(
      `/turnos/${encodeURIComponent(turnoId)}/piezas`,
      {
        method: 'PUT',
        body: {
          pieza: numero,
          estado: 'hecho'
        }
      }
    );

    if (!respuesta.ok) {
      throw new Error(
        respuesta.data?.error?.mensaje ||
        'No se pudo actualizar la pieza.'
      );
    }

    piezasGuardadas.set(numero, respuesta.data);

    mostrarLista();
    seleccionarPieza(numero);

    avisar(
      `Pieza ${numero} marcada como realizada.`,
      'exito'
    );

  } catch (error) {
    avisar(error.message, 'error');
  }
}

// ---------- Eventos e inicialización ----------

$('guardar').addEventListener('click', guardarPieza);
$('marcar-hecho').addEventListener('click', marcarPiezaHecha);

$('turno-id').addEventListener('change', cargarPiezas);

$('rol').addEventListener('change', () => {
  configurarRol();

  if (piezaActual !== null) {
    seleccionarPieza(piezaActual);
  }

  cargarPiezas();
});

$('actualizar').addEventListener('click', async () => {
  try {
    await cargarTurnos();
    await cargarPiezas();
  } catch (error) {
    avisar(error.message, 'error');
  }
});

async function iniciar() {
  configurarRol();
  dibujarOdontograma();

  try {
    await cargarTurnos();
    await cargarPiezas();
  } catch (error) {
    avisar(error.message, 'error');
  }
}

iniciar();
