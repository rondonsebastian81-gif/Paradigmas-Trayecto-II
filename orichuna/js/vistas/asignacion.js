"use strict";
/* ============================================================
   ORICHUNA.CA · Vista ASIGNACIÓN
   Registro del vehículo, generación del ticket y temporizador
   regresivo de confirmación (3 min por defecto).
   Registra su pintor y el gancho para detener el temporizador.
   ============================================================ */

(function () {

  const { estado, esc, dos, guardar, listarErrores, htmlTicket } = ORC;

  function pintarAsignacion() {
    const est = estado.estacion;
    const config = est.config;

    let banner = "";
    const motivosBloqueo = [];
    if (!config.enHorario()) motivosBloqueo.push(
      "El proceso de asignación está fuera de horario (" + config.rangoHorario() + ").");
    if (config.combustible <= 0) motivosBloqueo.push("No queda combustible para el día.");
    if (est.turnosRestantes() <= 0) motivosBloqueo.push("Se agotaron los 20 turnos del día.");

    const bloqueado = motivosBloqueo.length > 0;

    if (bloqueado) {
      banner = "<div class='aviso-bloqueo'>" +
        motivosBloqueo.map(esc).join("<br>") + "</div>";
    }

    let cuerpo = "";

    if (estado.ticketActual) {
      cuerpo = bloquePendiente();
    } else if (estado.resultadoActual) {
      cuerpo = htmlTicket(estado.resultadoActual) +
        "<div style='margin-top:12px'><button id='g-nuevo' class='boton'>Nueva asignación</button></div>";
    }

    cuerpo += "<div class='tarjeta'" + (estado.ticketActual ? " style='display:none'" : "") + "'>" +
      "<h3>" + (estado.ticketActual ? "Solicitud en proceso" : "Datos del vehículo") + "</h3>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Tipo *</label>" +
      "<select id='f-tipo'><option value=''>Seleccione...</option>" +
      "<option value='moto'>Moto</option><option value='automovil'>Automóvil</option>" +
      "<option value='camion'>Camión</option></select></div>" +
      "<div class='campo'><label class='etiqueta'>Marca * (solo letras)</label>" +
      "<input id='f-marca' class='entrada' placeholder='ej. Toyota'></div>" +
      "<div class='campo'><label class='etiqueta'>Modelo * (letras y números)</label>" +
      "<input id='f-modelo' class='entrada' placeholder='ej. Corolla 2020'></div>" +
      "</div>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Placa * (6-8 alfanuméricos)</label>" +
      "<input id='f-placa' class='entrada' placeholder='ej. ABC123' style='text-transform:uppercase'></div>" +
      "<div class='campo'><label class='etiqueta'>Color * (solo letras)</label>" +
      "<input id='f-color' class='entrada' placeholder='ej. Azul'></div>" +
      "</div>" +
      "<div id='f-errores'></div>" +
      "<button id='f-enviar' class='boton" + (bloqueado ? " boton-deshabilitado" : "") + "'" +
      (bloqueado ? " disabled" : "") + "'>Iniciar asignación</button>" +
      "</div>";

    ORC.$("vista-asignacion").innerHTML =
      "<h1 class='titulo'>Asignación de cupo</h1>" +
      "<p class='subtitulo'>ORICHUNA.CA · Registro de vehículos y generación de turnos.</p>" +
      "<div class='grilla-stats'>" +
      "<div class='stat'><div class='n'>" + config.combustible + "</div><div class='t'>L restantes hoy</div></div>" +
      "<div class='stat'><div class='n'>" + est.turnosRestantes() + "</div><div class='t'>Turnos libres</div></div>" +
      "<div class='stat'><div class='n'>" + config.cantidadMoto + " / " + config.cantidadAutomovil +
      " / " + config.cantidadCamion + "</div><div class='t'>L por Moto / Auto / Camión</div></div>" +
      "<div class='stat'><div class='n'>" + esc(config.rangoHorario()) + "</div><div class='t'>Horario (ahora: " +
      (config.enHorario() ? "en horario" : "fuera") + ")</div></div>" +
      "</div>" +
      banner + cuerpo;

    const boton = ORC.$("f-enviar");
    if (boton) boton.addEventListener("click", iniciarAsignacion);

    const nuevo = ORC.$("g-nuevo");
    if (nuevo) nuevo.addEventListener("click", function () {
      estado.resultadoActual = null;
      pintarAsignacion();
    });
  }

  function iniciarAsignacion() {
    const tipo = ORC.$("f-tipo").value;
    const datos = {
      tipo: tipo,
      marca: ORC.$("f-marca").value,
      modelo: ORC.$("f-modelo").value,
      placa: ORC.$("f-placa").value,
      color: ORC.$("f-color").value
    };
    let vehiculo;
    try {
      vehiculo = FabricaVehiculos.crear(tipo, datos.marca, datos.modelo, datos.placa, datos.color);
    } catch (e) {
      listarErrores(["Seleccione el tipo de vehículo."], ORC.$("f-errores"));
      return;
    }
    const erroresVehiculo = vehiculo.validar();
    if (!listarErrores(erroresVehiculo, ORC.$("f-errores"))) return;

    const config = estado.estacion.config;
    const litros = config.cantidadPara(vehiculo);

    if (config.combustible < litros) {
      listarErrores([
        "No queda combustible suficiente para hoy en la estación: se necesitan " +
        litros + " L y quedan " + config.combustible + " L."
      ], ORC.$("f-errores"));
      return;
    }

    const resultado = estado.estacion.crearTicket(vehiculo);
    if (resultado.error) {
      listarErrores([resultado.error], ORC.$("f-errores"));
      return;
    }
    estado.ticketActual = resultado.ticket;
    guardar();
    iniciarTemporizador(resultado.ticket);
    pintarAsignacion();
  }

  function bloquePendiente() {
    const t = estado.ticketActual;
    return "<div class='tarjeta bloque-pendiente'>" +
      "<h3>Solicitud en espera de confirmación</h3>" +
      "<p><b>" + esc(t.vehiculo.linea()) + "</b><br>" +
      "Turno <b>" + dos(t.turno) + "</b> · Código de verificación provisional: " +
      String(t.codigo).padStart(3, "0") + "</p>" +
      "<div id='g-tiempo' class='cronometro'>" + segundosATexto(estado.segundosRestantes) + "</div>" +
      "<p style='text-align:center;color:#64748b'>Confirme la asignación antes de que termine el tiempo, de lo contrario el cupo se cancelará.</p>" +
      "<div style='display:flex;gap:10px;justify-content:center;flex-wrap:wrap'>" +
      "<button id='g-confirmar' class='boton'>Confirmar asignación</button>" +
      "<button id='g-cancelar' class='boton boton-peligro'>Cancelar solicitud</button>" +
      "</div></div>";
  }

  function segundosATexto(seg) {
    const s = Math.max(0, seg);
    return dos(Math.floor(s / 60)) + ":" + dos(s % 60);
  }

  function pintarTemporizador(seg) {
    const el = ORC.$("g-tiempo");
    if (!el) return;
    el.textContent = segundosATexto(seg);
    el.className = "cronometro" + (seg <= 30 ? " urgente" : "");
  }

  function iniciarTemporizador(ticket) {
    detenerTemporizador();
    estado.segundosRestantes = estado.estacion.config.tiempoAsignacionSeg;
    pintarTemporizador(estado.segundosRestantes);
    estado.intervaloTimer = setInterval(function () {
      estado.segundosRestantes -= 1;
      pintarTemporizador(estado.segundosRestantes);
      if (estado.segundosRestantes <= 0) {
        detenerTemporizador();
        ticket.cancelar("Tiempo de espera agotado (límite de " +
          estado.estacion.config.tiempoAsignacionSeg + " segundos).");
        estado.ticketActual = null;
        estado.resultadoActual = ticket;
        guardar();
        pintarAsignacion();
      }
    }, 1000);
    const confirmar = ORC.$("g-confirmar");
    const cancelar = ORC.$("g-cancelar");
    if (confirmar) confirmar.addEventListener("click", confirmarAsignacion);
    if (cancelar) cancelar.addEventListener("click", cancelarAsignacion);
  }

  function detenerTemporizador() {
    if (estado.intervaloTimer) {
      clearInterval(estado.intervaloTimer);
      estado.intervaloTimer = null;
    }
  }

  function confirmarAsignacion() {
    const ticket = estado.ticketActual;
    if (!ticket) return;
    detenerTemporizador();
    ticket.aceptar(estado.estacion);
    estado.ticketActual = null;
    estado.resultadoActual = ticket;
    guardar();
    pintarAsignacion();
  }

  function cancelarAsignacion() {
    const ticket = estado.ticketActual;
    if (!ticket) return;
    const motivo = prompt("Motivo de la cancelación:", "Cancelado por el cliente") ||
      "Cancelado por el cliente";
    detenerTemporizador();
    ticket.cancelar(motivo);
    estado.ticketActual = null;
    estado.resultadoActual = ticket;
    guardar();
    pintarAsignacion();
  }

  ORC.pintores.asignacion = pintarAsignacion;
  ORC.detenerTemporizador = detenerTemporizador;

})();