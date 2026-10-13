"use strict";
/* ============================================================
   ORICHUNA.CA · Vista REPORTES
   Filtros de combustible asignado (tipo / marca / modelo) y
   reporte por estatus con detalle.
   ============================================================ */

(function () {

  const { estado, esc, dos, formatearFecha } = ORC;

  function pintarReportes() {
    const est = estado.estacion;
    const aceptados = est.tickets.filter(function (t) {
      return t.estatus === "aceptado";
    });

    function unic(lista, fn) {
      const set = new Set();
      lista.forEach(function (x) { set.add(fn(x)); });
      return Array.from(set).sort(function (a, b) {
        return a.localeCompare(b, "es");
      });
    }
    const tipos = unic(aceptados, function (t) { return t.vehiculo.tipo; });
    const marcas = unic(aceptados, function (t) { return t.vehiculo.marca; });
    const modelos = unic(aceptados, function (t) { return t.vehiculo.modelo; });

    function opcionesSelect(id, valores, actual) {
      return "<select id='" + id + "'><option value=''>Todos</option>" +
        valores.map(function (v) {
          const etiqueta = id === "r-tipo" ? NOMBRES_TIPO[v] : v;
          return "<option value='" + esc(v) + "'" + (v === actual ? " selected" : "") +
            ">" + esc(etiqueta) + "</option>";
        }).join("") + "</select>";
    }

    ORC.$("vista-reportes").innerHTML =
      "<h1 class='titulo'>Reportes</h1>" +
      "<p class='subtitulo'>Filtros de combustible asignado por tipo de vehículo, marca y modelo.</p>" +
      "<div class='tarjeta'>" +
      "<h3>Reporte por tipo de vehículo, marca y modelo</h3>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Tipo</label>" + opcionesSelect("r-tipo", tipos, "") + "</div>" +
      "<div class='campo'><label class='etiqueta'>Marca</label>" + opcionesSelect("r-marca", marcas, "") + "</div>" +
      "<div class='campo'><label class='etiqueta'>Modelo</label>" + opcionesSelect("r-modelo", modelos, "") + "</div>" +
      "</div>" +
      "<button id='r-aplicar' class='boton'>Calcular reporte</button>" +
      "<div id='r-resultado'></div>" +
      "</div>" +
      "<div class='tarjeta'>" +
      "<h3>Reporte por estatus</h3>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Estatus</label>" +
      "<select id='r-estatus'><option value='aceptado'>Aceptado</option>" +
      "<option value='cancelado'>Cancelado</option></select></div>" +
      "</div>" +
      "<button id='r-estatus-aplicar' class='boton'>Mostrar detalle</button>" +
      "<div id='r-estatus-resultado'></div>" +
      "</div>";

    ORC.$("r-aplicar").addEventListener("click", calcularReporteFiltro);
    ORC.$("r-estatus-aplicar").addEventListener("click", mostrarReporteEstatus);
  }

  function calcularReporteFiltro() {
    const tipo = ORC.$("r-tipo").value || null;
    const marca = ORC.$("r-marca").value || null;
    const modelo = ORC.$("r-modelo").value || null;
    const resultado = estado.estacion.reportePorFiltro(tipo, marca, modelo);
    const lista = resultado.tickets;

    ORC.$("r-resultado").innerHTML =
      "<div class='reporte-total'>Total de combustible asignado: <b>" +
      resultado.litros + " L</b> · Tickets: " + lista.length + "</div>" +
      (lista.length
        ? "<div class='tabla-wrapper'><table class='tabla'><thead><tr>" +
          "<th>Turno</th><th>Fecha</th><th>Tipo</th><th>Marca</th><th>Modelo</th>" +
          "<th>Placa</th><th>Color</th><th class='num'>Litros</th><th>Código</th>" +
          "</tr></thead><tbody>" +
          lista.map(function (t) {
            return "<tr><td class='num'>#" + dos(t.turno) + "</td>" +
              "<td>" + formatearFecha(t.fecha) + "</td>" +
              "<td>" + esc(t.vehiculo.nombreTipo()) + "</td>" +
              "<td>" + esc(t.vehiculo.marca) + "</td>" +
              "<td>" + esc(t.vehiculo.modelo) + "</td>" +
              "<td>" + esc(t.vehiculo.placa) + "</td>" +
              "<td>" + esc(t.vehiculo.color) + "</td>" +
              "<td class='num'><b>" + t.combustible + " L</b></td>" +
              "<td class='num'>" + String(t.codigo).padStart(3, "0") + "</td></tr>";
          }).join("") +
          "</tbody></table></div>"
        : "<p class='nota'>No hay tickets aceptados con esos filtros.</p>");
  }

  function mostrarReporteEstatus() {
    const estatus = ORC.$("r-estatus").value;
    const lista = estado.estacion.reportePorEstatus(estatus);
    ORC.$("r-estatus-resultado").innerHTML = lista.length
      ? "<div class='tabla-wrapper'><table class='tabla'><thead><tr>" +
        "<th>Turno</th><th>Fecha emisión</th><th>Vehículo</th><th>Placa</th>" +
        "<th>Estatus</th><th>Detalle</th></tr></thead><tbody>" +
        lista.map(function (t) {
          return "<tr><td class='num'>#" + dos(t.turno) + "</td>" +
            "<td>" + formatearFecha(t.fecha) + "</td>" +
            "<td>" + esc(t.vehiculo.linea()) + "</td>" +
            "<td>" + esc(t.vehiculo.placa) + "</td>" +
            "<td><span class='chip chip-" + t.estatus + "'>" + t.estatus + "</span></td>" +
            "<td>" + (t.estatus === "aceptado"
              ? esc(t.vehiculo.nombreTipo()) + " · " + t.combustible + " L"
              : esc(t.motivo)) + "</td></tr>";
        }).join("") +
        "</tbody></table></div>"
      : "<p class='nota'>No hay tickets con estatus " + estatus + ".</p>";
  }

  ORC.pintores.reportes = pintarReportes;

})();