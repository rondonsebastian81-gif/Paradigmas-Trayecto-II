"use strict";
/* ============================================================
   ORICHUNA.CA · Vista TICKETS
   Tabla con todos los comprobantes generados.
   ============================================================ */

(function () {

  const { estado, esc, dos, formatearFecha } = ORC;

  function pintarTickets() {
    const lista = estado.estacion.tickets.slice().sort(function (a, b) {
      return b.turno - a.turno;
    });
    const filas = lista.map(function (t) {
      const info = t.estatus === "aceptado"
        ? t.vehiculo.nombreTipo() + " · " + t.combustible + " L"
        : esc(t.motivo);
      return "<tr>" +
        "<td class='num'>#" + dos(t.turno) + "</td>" +
        "<td>" + formatearFecha(t.fecha) + "</td>" +
        "<td>" + esc(t.vehiculo.nombreTipo()) + "</td>" +
        "<td>" + esc(t.vehiculo.marca) + "</td>" +
        "<td>" + esc(t.vehiculo.modelo) + "</td>" +
        "<td>" + esc(t.vehiculo.placa) + "</td>" +
        "<td>" + esc(t.vehiculo.color) + "</td>" +
        "<td><span class='chip chip-" + t.estatus + "'>" + t.estatus + "</span></td>" +
        "<td>" + info + "</td>" +
        "<td class='num' style='font-weight:800'>" + String(t.codigo).padStart(3, "0") + "</td>" +
        "</tr>";
    }).join("");

    ORC.$("vista-tickets").innerHTML =
      "<h1 class='titulo'>Tickets generados</h1>" +
      "<p class='subtitulo'>Todos los comprobantes emitidos (" + lista.length +
      "). Tienen turno único (1-20) y código de verificación único de 3 dígitos.</p>" +
      "<div class='tabla-wrapper'><table class='tabla'><thead><tr>" +
      "<th>Turno</th><th>Fecha emisión</th><th>Tipo</th><th>Marca</th><th>Modelo</th>" +
      "<th>Placa</th><th>Color</th><th>Estatus</th><th>Combustible / Motivo</th>" +
      "<th>Código</th></tr></thead><tbody>" +
      (filas || "<tr><td colspan='10' style='text-align:center;color:#64748b'>Aún no hay tickets.</td></tr>") +
      "</tbody></table></div>";
  }

  ORC.pintores.tickets = pintarTickets;

})();