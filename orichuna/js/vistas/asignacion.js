"use strict";
/* ============================================================
   ORICHUNA.CA · Vista MI CUPO DE GASOLINA (solo cliente)
   El cliente registra su vehículo, elige cuántos litros desea
   (hasta el límite del tipo de vehículo) y envía la solicitud.
   La solicitud queda pendiente hasta que el personal la acepta
   y confirma el despacho.

   El cliente NUNCA ve el inventario de la estación ni cuántos
   cupos/turnos quedan: solo su turno, placa, estatus, litros
   solicitados y hora de recogida.
   ============================================================ */

(function () {

  const { estado, esc, dos, guardar, listarErrores } = ORC;

  function miTicket() {
    const est = estado.estacion;
    if (!estado.solicitante) return null;
    const pendiente = est.solicitudesPendientes().find(function (t) {
      return t.solicitante === estado.solicitante;
    });
    return pendiente || est.cupoDelDia(estado.solicitante);
  }

  function chipEstatus(t) {
    const texto = t.estatus === "aceptado"
      ? "Cupo confirmado"
      : t.estatus === "pendiente" ? "En revisión" : "Cancelado";
    return "<span class='chip chip-" + t.estatus + "'>" + texto + "</span>";
  }

  function tarjetaCupo(t) {
    const pendiente = t.estatus === "pendiente";
    const aceptado = t.estatus === "aceptado";
    const nota = aceptado
      ? "Tu cupo está confirmado. Pasa a recoger tu gasolina a la hora indicada " +
        "con la placa del vehículo y este código."
      : pendiente
        ? "El personal de la estación revisará tu solicitud y confirmará el despacho. " +
          "Guarda tu hora de recogida y tu código."
        : "Esta solicitud fue cancelada.";
    return "<div class='tarjeta cupo-cliente" + (pendiente ? " cupo-pendiente" : "") + "'>" +
      "<div class='cupo-enc'>" +
      "<div class='cupo-turno'>#" + dos(t.turno) + "</div>" +
      "<div class='cupo-titulo'><h3>" +
      (aceptado ? "Tu cupo de gasolina" : pendiente ? "Solicitud enviada" : "Solicitud cancelada") +
      "</h3><p>" + chipEstatus(t) + "</p></div>" +
      "</div>" +
      "<div class='cupo-datos'>" +
      "<div class='cupo-dato'><span>Hora de recogida</span><b>" + esc(t.horaRecogida || "—") + "</b></div>" +
      "<div class='cupo-dato'><span>Placa</span><b>" + esc(t.vehiculo.placa) + "</b></div>" +
      "<div class='cupo-dato'><span>Litros solicitados</span><b>" + t.combustible + " L</b></div>" +
      "<div class='cupo-dato'><span>Código</span><b>" + String(t.codigo).padStart(3, "0") + "</b></div>" +
      "</div>" +
      "<p class='cupo-vehiculo'>" + esc(t.vehiculo.linea()) + "</p>" +
      "<p class='nota'>" + nota + "</p>" +
      "<div class='cupo-acciones'>" +
      "<button id='g-actualizar' class='boton boton-secundario'>Actualizar estado</button>" +
      (pendiente
        ? "<button id='g-cancelar' class='boton boton-peligro'>Cancelar solicitud</button>"
        : "") +
      "</div>" +
      "</div>";
  }

  function pintarAsignacion() {
    const est = estado.estacion;
    const config = est.config;
    const ticket = miTicket();

    let cuerpo = "";

    if (ticket) {
      cuerpo = tarjetaCupo(ticket);
    } else {
      const avisos = [];
      const disponible = config.hayCombustible();
      if (!disponible) {
        avisos.push("No hay litros disponibles en la estación en este momento. " +
          "Intenta de nuevo más tarde.");
      }
      if (!config.enHorario()) {
        avisos.push("El servicio de cupos está fuera de horario (" +
          config.rangoHorario() + ").");
      }
      const sinTurnos = est.turnosRestantes() <= 0;
      if (sinTurnos && disponible) {
        avisos.push("No hay cupos disponibles en este momento.");
      }

      const bloqueado = !disponible || sinTurnos || !config.enHorario();

      cuerpo = (avisos.length
        ? "<div class='aviso-bloqueo'>" + avisos.map(esc).join("<br>") + "</div>"
        : "") +
        "<div class='tarjeta'>" +
        "<h3>Solicitar mi cupo</h3>" +
        "<p class='nota'>Indica los datos del vehículo y cuántos litros deseas cargar. " +
        "El personal de la estación confirmará tu solicitud.</p>" +
        "<div class='filtros'>" +
        "<div class='campo'><label class='etiqueta'>Tipo de vehículo *</label>" +
        "<select id='f-tipo'><option value=''>Seleccione...</option>" +
        "<option value='moto'>Moto</option><option value='automovil'>Automóvil</option>" +
        "<option value='camion'>Camión</option></select></div>" +
        "<div class='campo'><label class='etiqueta'>Marca * (solo letras)</label>" +
        "<input id='f-marca' class='entrada' maxlength='80' placeholder='ej. Toyota'></div>" +
        "<div class='campo'><label class='etiqueta'>Modelo * (letras y números)</label>" +
        "<input id='f-modelo' class='entrada' maxlength='80' placeholder='ej. Corolla 2020'></div>" +
        "</div>" +
        "<div class='filtros'>" +
        "<div class='campo'><label class='etiqueta'>Placa * (6-8 alfanuméricos)</label>" +
        "<input id='f-placa' class='entrada' maxlength='8' placeholder='ej. ABC123' style='text-transform:uppercase'></div>" +
        "<div class='campo'><label class='etiqueta'>Color * (solo letras)</label>" +
        "<input id='f-color' class='entrada' maxlength='60' placeholder='ej. Azul'></div>" +
        "<div class='campo'><label class='etiqueta'>Litros a solicitar *</label>" +
        "<input id='f-litros' class='entrada' type='number' min='0.5' step='0.01' placeholder='Selecciona el tipo'></div>" +
        "<div id='f-limite' class='nota'>Selecciona el tipo de vehículo para ver el máximo permitido.</div>" +
        "</div>" +
        "<div id='f-errores'></div>" +
        "<button id='f-enviar' class='boton" + (bloqueado ? " boton-deshabilitado" : "") + "'" +
        (bloqueado ? " disabled" : "") + ">Enviar solicitud de cupo</button>" +
        "</div>";
    }

    ORC.$("vista-asignacion").innerHTML =
      "<h1 class='titulo'>Mi cupo de gasolina</h1>" +
      "<p class='subtitulo'>ORICHUNA.CA · Solicita tu cupo y consulta la hora de recogida.</p>" +
      cuerpo;

    const cancelar = ORC.$("g-cancelar");
    if (cancelar) cancelar.addEventListener("click", cancelarSolicitud);

    const actualizar = ORC.$("g-actualizar");
    if (actualizar) actualizar.addEventListener("click", function () {
      ORC.recargarEstado().then(pintarAsignacion);
    });

    const tipo = ORC.$("f-tipo");
    if (tipo) {
      tipo.addEventListener("change", actualizarLimite);
      const enviar = ORC.$("f-enviar");
      if (enviar) enviar.addEventListener("click", solicitarCupo);
      actualizarLimite();
    }
  }

  /* Ajusta el máximo de litros según el tipo de vehículo elegido. */
  function actualizarLimite() {
    const tipo = ORC.$("f-tipo").value;
    const litros = ORC.$("f-litros");
    const limite = ORC.$("f-limite");
    if (!litros || !limite) return;
    if (!tipo) {
      litros.removeAttribute("max");
      limite.textContent = "Selecciona el tipo de vehículo para ver el máximo permitido.";
      return;
    }
    let maximo;
    try {
      maximo = estado.estacion.config.cantidadPara(FabricaVehiculos.crear(tipo, "X", "X", "ABC123", "X"));
    } catch (e) {
      maximo = 0;
    }
    litros.max = String(maximo);
    if (Number(litros.value) > maximo) litros.value = String(maximo);
    limite.textContent = "Máximo permitido para " + NOMBRES_TIPO[tipo].toLowerCase() +
      ": " + maximo + " L.";
  }

  function solicitarCupo() {
    const tipo = ORC.$("f-tipo").value;
    let vehiculo;
    try {
      vehiculo = FabricaVehiculos.crear(tipo,
        ORC.$("f-marca").value, ORC.$("f-modelo").value,
        ORC.$("f-placa").value, ORC.$("f-color").value);
    } catch (e) {
      listarErrores(["Seleccione el tipo de vehículo."], ORC.$("f-errores"));
      return;
    }
    if (!listarErrores(vehiculo.validar(), ORC.$("f-errores"))) return;

    const litros = ORC.$("f-litros").value;
    const resultado = estado.estacion.crearTicket(vehiculo, estado.solicitante, litros);
    if (resultado.error) {
      listarErrores([resultado.error], ORC.$("f-errores"));
      return;
    }
    guardar();
    pintarAsignacion();
  }

  function cancelarSolicitud() {
    const ticket = miTicket();
    if (!ticket || ticket.estatus !== "pendiente") return;
    if (!confirm("¿Cancelar tu solicitud de cupo? El turno quedará libre.")) return;
    ticket.cancelar("Cancelado por el cliente.");
    guardar();
    pintarAsignacion();
  }

  ORC.pintores.asignacion = pintarAsignacion;

})();
