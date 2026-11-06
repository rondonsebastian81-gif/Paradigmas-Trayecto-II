"use strict";
/* ============================================================
   ORICHUNA.CA · Vista SOLICITUDES DE CUPO (personal)
   El administrador o el empleado revisa las solicitudes enviadas
   por los clientes y confirma el despacho (descuenta el
   combustible) o las cancela con un motivo.
   ============================================================ */

(function () {

  const { estado, esc, dos, guardar, formatearFecha } = ORC;

  function pintarSolicitudes(mensaje) {
    const est = estado.estacion;
    const pendientes = est.solicitudesPendientes().slice().sort(function (a, b) {
      return a.turno - b.turno;
    });
    const totalSolicitado = pendientes.reduce(function (s, t) {
      return s + (Number(t.combustible) || 0);
    }, 0);
    const sinCombustible = !est.config.hayCombustible();

    const filas = pendientes.map(function (t) {
      return "<tr>" +
        "<td class='num'>#" + dos(t.turno) + "</td>" +
        "<td class='num'><b>" + esc(t.horaRecogida || "—") + "</b></td>" +
        "<td>" + formatearFecha(t.fecha) + "</td>" +
        "<td>" + esc(t.vehiculo.placa) + "</td>" +
        "<td>" + esc(t.vehiculo.nombreTipo()) + "</td>" +
        "<td class='num'>" + t.combustible + " L</td>" +
        "<td>" + esc(t.etiquetaSolicitante()) + "</td>" +
        "<td class='acciones'>" +
        "<button class='boton boton-chico' data-accion='despachar' data-id='" + t.id + "'>Despachar</button> " +
        "<button class='boton boton-chico boton-peligro' data-accion='cancelar' data-id='" + t.id + "'>Cancelar</button>" +
        "</td>" +
        "</tr>";
    }).join("");

    ORC.$("vista-solicitudes").innerHTML =
      "<h1 class='titulo'>Solicitudes de cupo</h1>" +
      "<p class='subtitulo'>Acepta y confirma el despacho de las solicitudes enviadas por los clientes.</p>" +
      "<div class='barra-acciones'><button id='s-actualizar' class='boton boton-secundario boton-chico'>Actualizar lista</button></div>" +
      (mensaje || "") +
      (sinCombustible
        ? "<div class='aviso-bloqueo'>No hay litros disponibles en la estación. " +
          "Repón combustible en «Surtir estación» antes de despachar.</div>"
        : "") +
      "<div class='grilla-stats'>" +
      "<div class='stat'><div class='n'>" + pendientes.length + "</div><div class='t'>Solicitudes pendientes</div></div>" +
      "<div class='stat'><div class='n'>" + totalSolicitado + " L</div><div class='t'>Litros solicitados</div></div>" +
      "<div class='stat'><div class='n'>" + est.config.combustible + " L</div><div class='t'>Combustible disponible</div></div>" +
      "</div>" +
      "<div class='tabla-wrapper'><table class='tabla'><thead><tr>" +
      "<th>Turno</th><th>Hora recogida</th><th>Solicitada</th><th>Placa</th>" +
      "<th>Tipo</th><th class='num'>Litros</th><th>Solicitante</th><th>Acciones</th>" +
      "</tr></thead><tbody>" +
      (filas || "<tr><td colspan='8' style='text-align:center;color:#64748b'>" +
        "No hay solicitudes pendientes.</td></tr>") +
      "</tbody></table></div>";

    ORC.$("vista-solicitudes").querySelectorAll("button[data-accion]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.accion === "despachar") despachar(b.dataset.id);
        else cancelar(b.dataset.id);
      });
    });

    const btnActualizar = ORC.$("s-actualizar");
    if (btnActualizar) {
      btnActualizar.addEventListener("click", function () {
        btnActualizar.disabled = true;
        btnActualizar.textContent = "Actualizando...";
        ORC.recargarEstado().then(function () {
          pintarSolicitudes("<p class='aviso-ok'>Lista actualizada.</p>");
        });
      });
    }
  }

  function buscarTicket(id) {
    return estado.estacion.tickets.find(function (t) {
      return String(t.id) === String(id);
    });
  }

  function despachar(id) {
    const ticket = buscarTicket(id);
    if (!ticket) return;
    const resultado = ticket.aceptar(estado.estacion);
    if (resultado.error) {
      pintarSolicitudes("<div class='aviso-bloqueo'>" + esc(resultado.error) + "</div>");
      return;
    }
    guardar();
    pintarSolicitudes("<p class='aviso-ok'>Solicitud del turno #" + dos(ticket.turno) +
      " despachada: " + ticket.combustible + " L para la placa " +
      esc(ticket.vehiculo.placa) + ".</p>");
  }

  function cancelar(id) {
    const ticket = buscarTicket(id);
    if (!ticket) return;
    const respuesta = prompt("Motivo de la cancelación (máximo 255 caracteres):",
      "Cancelado por el personal.");
    if (respuesta === null) return;
    const motivo = Validador.normalizarMotivo(respuesta) || "Cancelado por el personal.";
    ticket.cancelar(motivo);
    guardar();
    pintarSolicitudes("<p class='aviso-ok'>Solicitud del turno #" + dos(ticket.turno) +
      " cancelada.</p>");
  }

  ORC.pintores.solicitudes = pintarSolicitudes;

})();
