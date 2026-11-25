
const agenda = document.getElementById('agenda');
const registro = document.getElementById('registro');
const resultadoTurno = document.getElementById('resultado-turno');
const selectorRol = document.getElementById('rol-simulado');

const ZONA = 'America/Argentina/Buenos_Aires';
const HORA_INICIO = 9 * 60;
const HORA_FIN = 19 * 60;
const BLOQUE = 15;

let turnos = [];
let vista = 'dia';

let catalogo = {
  profesionales: [],
  sillones: [],
  prestaciones: []
};

// Construimos los controles de la agenda.
agenda.innerHTML = `
  <div class="controles-agenda">
    <label>Fecha:
      <input type="date" id="fecha-agenda">
    </label>

    <label>Profesional:
      <select id="filtro-profesional"></select>
    </label>

    <label>Sillón:
      <select id="filtro-sillon"></select>
    </label>

    <button id="actualizar-agenda" type="button">
      Actualizar
    </button>
  </div>

  <div id="grilla-agenda"></div>
`;

const fechaInput = document.getElementById('fecha-agenda');
const filtroProfesional = document.getElementById('filtro-profesional');
const filtroSillon = document.getElementById('filtro-sillon');
const grilla = document.getElementById('grilla-agenda');

const formulario = document.getElementById('form-nuevo-turno');
const nuevoInicio = document.getElementById('nuevo-inicio');

// ---------- Fechas y horarios ----------

function fechaArgentina(valor) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(valor));
}

function horaArgentina(valor) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(new Date(valor));
}

function minutosDeHora(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function horaDeMinutos(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function obtenerDias() {
  const fecha = new Date(`${fechaInput.value}T12:00:00Z`);

  if (vista === 'semana') {
    const diaSemana = (fecha.getUTCDay() + 6) % 7;
    fecha.setUTCDate(fecha.getUTCDate() - diaSemana);
  }

  const cantidad = vista === 'semana' ? 7 : 1;
  const dias = [];

  for (let i = 0; i < cantidad; i++) {
    const dia = new Date(fecha);
    dia.setUTCDate(fecha.getUTCDate() + i);
    dias.push(dia.toISOString().slice(0, 10));
  }

  return dias;
}

// ---------- Catálogo real ----------

function nombreDe(lista, id) {
  return lista.find(item => item.id === id)?.nombre ?? id;
}

function llenarSelector(selector, elementos, incluirTodos = false) {
  const anterior = selector.value;
  selector.replaceChildren();

  if (incluirTodos) {
    selector.add(new Option('Todos', ''));
  }

  for (const elemento of elementos) {
    selector.add(new Option(elemento.nombre, elemento.id));
  }

  if ([...selector.options].some(op => op.value === anterior)) {
    selector.value = anterior;
  }
}

async function cargarCatalogo() {
  const respuesta = await api('/catalogo');

  if (!respuesta.ok) {
    throw new Error('No se pudo consultar el catálogo.');
  }

  catalogo = respuesta.data;

  llenarSelector(
    filtroProfesional,
    catalogo.profesionales,
    true
  );

  llenarSelector(
    filtroSillon,
    catalogo.sillones,
    true
  );

  llenarSelector(
    document.getElementById('nuevo-profesional'),
    catalogo.profesionales
  );

  llenarSelector(
    document.getElementById('nuevo-sillon'),
    catalogo.sillones
  );

  llenarSelector(
    document.getElementById('nueva-prestacion'),
    catalogo.prestaciones
  );
}

// ---------- Estados ----------

function nombreEstado(estado) {
  const estados = {
    reservado: 'Sin confirmar',
    sin_confirmar: 'Sin confirmar',
    confirmado: 'Confirmó',
    atendido: 'Atendido'
  };

  return estados[estado] ?? estado;
}

// ---------- Distribución de turnos ----------

// Si dos turnos se superponen visualmente, los ubicamos
// uno al lado del otro, en lugar de taparlos.
function distribuirTurnos(eventos) {
  const ordenados = [...eventos].sort(
    (a, b) => a.desde - b.desde || a.hasta - b.hasta
  );

  let grupo = [];
  let finGrupo = -1;

  function cerrarGrupo() {
    if (grupo.length === 0) return;

    const finales = [];

    for (const evento of grupo) {
      let columna = finales.findIndex(
        fin => fin <= evento.desde
      );

      if (columna === -1) {
        columna = finales.length;
        finales.push(evento.hasta);
      } else {
        finales[columna] = evento.hasta;
      }

      evento.columna = columna;
    }

    for (const evento of grupo) {
      evento.totalColumnas = finales.length;
    }
  }

  for (const evento of ordenados) {
    if (grupo.length > 0 && evento.desde >= finGrupo) {
      cerrarGrupo();
      grupo = [];
    }

    grupo.push(evento);
    finGrupo = Math.max(finGrupo, evento.hasta);
  }

  cerrarGrupo();
  return ordenados;
}

// ---------- Agenda visual ----------

function mostrarAgenda() {
  grilla.replaceChildren();

  if (!fechaInput.value) return;

  const dias = obtenerDias();
  const cantidadBloques = (HORA_FIN - HORA_INICIO) / BLOQUE;

  const filtrados = turnos.filter(turno =>
    (!filtroProfesional.value ||
      turno.profesionalId === filtroProfesional.value) &&
    (!filtroSillon.value ||
      turno.sillonId === filtroSillon.value)
  );

  const calendario = document.createElement('div');
  calendario.className = 'calendario-grid';

  calendario.style.gridTemplateColumns =
    `76px repeat(${dias.length}, minmax(170px, 1fr))`;

  calendario.style.gridTemplateRows =
    `42px repeat(${cantidadBloques}, 42px)`;

  calendario.style.minWidth =
    dias.length === 7 ? '1280px' : '420px';

  // Esquina superior izquierda.
  const esquina = document.createElement('div');
  esquina.className = 'encabezado-dia';
  esquina.textContent = 'Hora';
  esquina.style.gridColumn = '1';
  esquina.style.gridRow = '1';
  calendario.appendChild(esquina);

  // Encabezados de cada día.
  dias.forEach((dia, indice) => {
    const encabezado = document.createElement('div');
    encabezado.className = 'encabezado-dia';

    encabezado.textContent = new Date(
      `${dia}T12:00:00Z`
    ).toLocaleDateString('es-AR', {
      timeZone: 'UTC',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });

    encabezado.style.gridColumn = String(indice + 2);
    encabezado.style.gridRow = '1';

    calendario.appendChild(encabezado);
  });

  // Grilla de intervalos de 15 minutos.
  for (let i = 0; i < cantidadBloques; i++) {
    const minutos = HORA_INICIO + i * BLOQUE;
    const horario = horaDeMinutos(minutos);
    const fila = i + 2;

    const etiqueta = document.createElement('div');
    etiqueta.className = 'eje-hora';
    etiqueta.textContent = horario;
    etiqueta.style.gridColumn = '1';
    etiqueta.style.gridRow = String(fila);

    calendario.appendChild(etiqueta);

    dias.forEach((dia, indice) => {
      const celda = document.createElement('div');
      celda.className = 'celda-horaria';

      celda.style.gridColumn = String(indice + 2);
      celda.style.gridRow = String(fila);

      const instante = new Date(
        `${dia}T${horario}:00-03:00`
      );

      if (instante < new Date()) {
        celda.classList.add('celda-pasada');
      }

      calendario.appendChild(celda);
    });
  }

  // Mostrar los turnos reales sobre la grilla.
  dias.forEach((dia, indiceDia) => {
    const eventos = filtrados
      .filter(turno => fechaArgentina(turno.inicio) === dia)
      .map(turno => {
        const desde = minutosDeHora(
          horaArgentina(turno.inicio)
        );

        const duracion = Math.round(
          (new Date(turno.fin) - new Date(turno.inicio)) / 60000
        );

        return {
          turno,
          desde,
          hasta: desde + duracion
        };
      })
      .filter(evento =>
        evento.hasta > HORA_INICIO &&
        evento.desde < HORA_FIN
      );

    for (const evento of distribuirTurnos(eventos)) {
      const turno = evento.turno;

      const inicioVisible = Math.max(
        evento.desde,
        HORA_INICIO
      );

      const finVisible = Math.min(
        evento.hasta,
        HORA_FIN
      );

      const fila = Math.floor(
        (inicioVisible - HORA_INICIO) / BLOQUE
      ) + 2;

      const bloques = Math.ceil(
        (finVisible - inicioVisible) / BLOQUE
      );

      const tarjeta = document.createElement('div');

      tarjeta.className =
        `turno-bloque tipo-${turno.prestacionId}`;

      tarjeta.style.gridColumn = String(indiceDia + 2);
      tarjeta.style.gridRow = `${fila} / span ${bloques}`;

      tarjeta.style.width =
        `calc(${100 / evento.totalColumnas}% - 4px)`;

      tarjeta.style.marginLeft =
        `${100 * evento.columna / evento.totalColumnas}%`;

      const prestacion = nombreDe(
        catalogo.prestaciones,
        turno.prestacionId
      );

      const profesional = nombreDe(
        catalogo.profesionales,
        turno.profesionalId
      );

      const sillon = nombreDe(
        catalogo.sillones,
        turno.sillonId
      );

      const icono = turno.origen === 'whatsapp'
        ? '💬 '
        : '';

      const descripcion =
        `${icono}${horaArgentina(turno.inicio)}–${horaArgentina(turno.fin)}\n` +
        `${turno.pacienteId} · ${prestacion}\n` +
        `${nombreEstado(turno.estado)} · ${profesional} · ${sillon}`;

      tarjeta.textContent = descripcion;
      tarjeta.title = descripcion;

      if (new Date(turno.fin) < new Date()) {
        tarjeta.classList.add('turno-pasado');
      }

      calendario.appendChild(tarjeta);
    }
  });

  grilla.appendChild(calendario);
}

// ---------- Consultar turnos ----------

async function cargarTurnos() {
  grilla.textContent = 'Cargando agenda...';

  try {
    const respuesta = await api('/turnos');

    if (!respuesta.ok || !Array.isArray(respuesta.data?.turnos)) {
      throw new Error('Respuesta de turnos inválida');
    }

    turnos = respuesta.data.turnos;
    actualizarTurnosCancelables();

    if (!fechaInput.value) {
      fechaInput.value = fechaArgentina(
        turnos.length > 0 ? turnos[0].inicio : new Date()
      );
    }

    mostrarAgenda();

  } catch (error) {
    grilla.textContent = 'No se pudo cargar la agenda.';
    console.error(error);
  }
}

// ---------- Botones y filtros ----------

const botonDia = document.getElementById('vista-dia');
const botonSemana = document.getElementById('vista-semana');

function cambiarVista(nuevaVista) {
  vista = nuevaVista;

  botonDia.classList.toggle('activo', vista === 'dia');
  botonSemana.classList.toggle('activo', vista === 'semana');

  mostrarAgenda();
}

botonDia.addEventListener('click', () => cambiarVista('dia'));
botonSemana.addEventListener('click', () => cambiarVista('semana'));

fechaInput.addEventListener('change', mostrarAgenda);
filtroProfesional.addEventListener('change', mostrarAgenda);
filtroSillon.addEventListener('change', mostrarAgenda);

document.getElementById('actualizar-agenda')
  .addEventListener('click', cargarTurnos);

// ---------- Rol simulado ----------

function configurarRol(rol) {
  localStorage.setItem('rol', rol);
  localStorage.setItem('usuario', 'u-' + rol);
}

const rolGuardado = localStorage.getItem('rol');

if (['recepcion', 'admin', 'odontologo'].includes(rolGuardado)) {
  selectorRol.value = rolGuardado;
}

configurarRol(selectorRol.value);

selectorRol.addEventListener('change', () => {
  configurarRol(selectorRol.value);
  resultadoTurno.textContent = '';
  cargarRegistro();
});

// ---------- Crear turno ----------

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();

  resultadoTurno.textContent = 'Creando turno...';
  resultadoTurno.style.color = '';

  const inicio = nuevoInicio.value;

  const datos = {
    pacienteId: document.getElementById('nuevo-paciente').value,
    profesionalId: document.getElementById('nuevo-profesional').value,
    sillonId: document.getElementById('nuevo-sillon').value,
    prestacionId: document.getElementById('nueva-prestacion').value,
    inicio: inicio + ':00-03:00'
  };

  try {
    const respuesta = await api('/turnos', {
      method: 'POST',
      body: datos
    });

    if (respuesta.ok) {
      resultadoTurno.textContent = 'Turno creado correctamente.';
      resultadoTurno.style.color = 'green';

      fechaInput.value = inicio.slice(0, 10);

      await cargarTurnos();
      await cargarRegistro();
      return;
    }

    resultadoTurno.style.color = 'crimson';

    const mensaje = respuesta.data?.error?.mensaje
      || 'El servidor rechazó el turno.';

    if (respuesta.status === 409) {
      const conflicto = respuesta.data?.error?.conflicto?.turnoId;

      resultadoTurno.textContent =
        'Conflicto de horario: ' + mensaje +
        (conflicto ? ` Turno en conflicto: ${conflicto}` : '');

    } else if (respuesta.status === 403) {
      resultadoTurno.textContent =
        'Este rol no tiene permiso para crear turnos.';

    } else {
      resultadoTurno.textContent = mensaje;
    }

  } catch (error) {
    resultadoTurno.style.color = 'crimson';
    resultadoTurno.textContent = 'No se pudo conectar con el servidor.';
    console.error(error);
  }
});

// ---------- Registro de auditoría ----------

async function cargarRegistro() {
  registro.textContent = 'Cargando registro...';

  try {
    const respuesta = await api('/registro');

    if (!respuesta.ok) {
      registro.textContent = respuesta.status === 403
        ? 'Este rol no tiene permiso para consultar el registro.'
        : 'No se pudo cargar el registro.';
      return;
    }

    const eventos = respuesta.data?.registro;

    if (!Array.isArray(eventos) || eventos.length === 0) {
      registro.textContent = 'Todavía no hay acciones registradas.';
      return;
    }

    const lista = document.createElement('ul');

    for (const evento of [...eventos].reverse()) {
      const item = document.createElement('li');

      const fecha = new Intl.DateTimeFormat('es-AR', {
        timeZone: ZONA,
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(evento.fecha));

      item.textContent = `${fecha} — ${evento.mensaje}`;
      lista.appendChild(item);
    }

    registro.replaceChildren(lista);

  } catch (error) {
    registro.textContent = 'Error al consultar el servidor.';
    console.error(error);
  }
}

document.getElementById('actualizar-registro')
  .addEventListener('click', cargarRegistro);

// ---------- Inicialización ----------

async function iniciar() {
  try {
    await cargarCatalogo();
    await cargarTurnos();
    cambiarVista('dia');
  } catch (error) {
    grilla.textContent = 'No se pudo cargar el catálogo.';
    console.error(error);
  }

  await cargarRegistro();
}


/* ---------- Cancelar turnos ---------- */

const panelCancelacion = document.createElement('section');
panelCancelacion.id = 'panel-cancelacion';
panelCancelacion.style.cssText =
  'margin:16px 0;padding:16px;border:1px solid #ccc;border-radius:12px';

panelCancelacion.innerHTML =
  '<h3>Cancelar turno</h3>' +
  '<form id="form-cancelar-turno">' +
  '<label>Turno: <select id="turno-a-cancelar" required></select></label>' +
  '<label>Motivo: <input id="motivo-cancelacion" required ' +
  'placeholder="Motivo de cancelación"></label>' +
  '<button type="submit" id="boton-cancelar-turno">Cancelar turno</button>' +
  '</form>' +
  '<p id="resultado-cancelacion" role="status"></p>';

agenda.insertAdjacentElement('afterend', panelCancelacion);

const selectorCancelar = document.getElementById('turno-a-cancelar');
const motivoCancelar = document.getElementById('motivo-cancelacion');
const resultadoCancelacion = document.getElementById('resultado-cancelacion');
const botonCancelar = document.getElementById('boton-cancelar-turno');

function actualizarTurnosCancelables() {
  const rol = selectorRol.value;
  const autorizado = rol === 'recepcion' || rol === 'admin';
  panelCancelacion.style.display = autorizado ? '' : 'none';

  const anterior = selectorCancelar.value;
  selectorCancelar.replaceChildren();
  selectorCancelar.add(new Option('Seleccioná un turno', ''));

  const disponibles = turnos.filter(function (turno) {
    return ['reservado', 'confirmado'].includes(turno.estado) &&
      new Date(turno.inicio) > new Date();
  });

  for (const turno of disponibles) {
    const etiqueta = turno.pacienteId + ' - ' +
      fechaArgentina(turno.inicio) + ' ' + horaArgentina(turno.inicio);
    selectorCancelar.add(new Option(etiqueta, turno.id));
  }

  if (disponibles.some(t => t.id === anterior)) {
    selectorCancelar.value = anterior;
  }

  botonCancelar.disabled = !autorizado || disponibles.length === 0;
}

selectorRol.addEventListener('change', actualizarTurnosCancelables);

document.getElementById('form-cancelar-turno')
  .addEventListener('submit', async function (evento) {
    evento.preventDefault();

    const turnoId = selectorCancelar.value;
    const motivo = motivoCancelar.value.trim();

    if (!turnoId || !motivo) return;

    if (!confirm('¿Confirmás la cancelación de este turno?')) return;

    botonCancelar.disabled = true;
    resultadoCancelacion.textContent = 'Cancelando...';
    resultadoCancelacion.style.color = '';

    try {
      const respuesta = await api(
        '/turnos/' + encodeURIComponent(turnoId) + '/cancelar',
        { method: 'POST', body: { motivo } }
      );

      if (!respuesta.ok) {
        resultadoCancelacion.style.color = 'crimson';
        resultadoCancelacion.textContent =
          respuesta.data?.error?.mensaje || 'No se pudo cancelar.';
        return;
      }

      motivoCancelar.value = '';
      await cargarTurnos();
      await cargarRegistro();

      resultadoCancelacion.style.color = 'green';
      resultadoCancelacion.textContent =
        'Turno cancelado. Consultá el WhatsApp simulado del paciente.';
    } catch (error) {
      resultadoCancelacion.style.color = 'crimson';
      resultadoCancelacion.textContent = 'Error de conexión.';
      console.error(error);
    } finally {
      actualizarTurnosCancelables();
    }
  });


iniciar();
