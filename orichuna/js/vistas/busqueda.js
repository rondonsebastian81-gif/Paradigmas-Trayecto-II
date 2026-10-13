"use strict";
/* ============================================================
   ORICHUNA.CA · Vista BÚSQUEDA
   Búsqueda de tickets por código de verificación (3 dígitos)
   o por placa del vehículo.
   ============================================================ */

(function () {

  const { estado, esc, htmlTicket } = ORC;

  function pintarBusqueda() {
    ORC.$("vista-busqueda").innerHTML =
      "<h1 class='titulo'>Búsqueda de tickets</h1>" +
      "<p class='subtitulo'>Busque por código de verificación (3 dígitos) o por placa del vehículo.</p>" +
      "<div class='tarjeta'>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Código de verificación o placa</label>" +
      "<input id='b-texto' class='entrada' placeholder='891 o ABC123'></div>" +
      "</div>" +
      "<button id='b-buscar' class='boton'>Buscar</button>" +
      "<div id='b-resultado'></div>" +
      "</div>";
    ORC.$("b-buscar").addEventListener("click", buscarTickets);
    ORC.$("b-texto").addEventListener("keydown", function (e) {
      if (e.key === "Enter") buscarTickets();
    });
  }

  function buscarTickets() {
    const texto = ORC.$("b-texto").value.trim();
    ORC.$("b-resultado").innerHTML = "";
    if (!texto) {
      ORC.$("b-resultado").innerHTML = "<p class='nota'>Escriba un código o una placa.</p>";
      return;
    }
    const lista = estado.estacion.buscar(texto);
    if (!lista.length) {
      ORC.$("b-resultado").innerHTML = "<p class='nota'>No se encontraron tickets para «" +
        esc(texto) + "».</p>";
      return;
    }
    ORC.$("b-resultado").innerHTML = lista.map(htmlTicket).join("");
  }

  ORC.pintores.busqueda = pintarBusqueda;

})();