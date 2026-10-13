"use strict";
/* ============================================================
   ORICHUNA.CA · Vista SURTIR ESTACIÓN
   Configuración diaria: combustible, horario, litros por tipo
   de vehículo y tiempo límite de asignación (validados).
   ============================================================ */

(function () {

  const { estado, esc, guardar, listarErrores } = ORC;

  function stateFuel() {
    const c = estado.estacion.config;
    return c.fecha === estado.estacion.fechaActual()
      ? c.combustible + " L (hoy)"
      : "días anteriores → actualice";
  }

  function pintarEstacion() {
    const c = estado.estacion.config;
    ORC.$("vista-estacion").innerHTML =
      "<h1 class='titulo'>Surtir estación</h1>" +
      "<p class='subtitulo'>Configuración diaria de la distribución. Campos obligatorios y validados.</p>" +
      "<div class='grilla-stats'>" +
      "<div class='stat'><div class='n'>" + stateFuel() + "</div><div class='t'>L para el día " + esc(c.fecha) + "</div></div>" +
      "</div>" +
      "<div class='tarjeta'>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Cantidad de combustible del día (L) *</label>" +
      "<input id='c-combustible' type='number' min='1' value='" + c.combustible + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Hora de inicio *</label>" +
      "<input id='c-inicio' type='time' value='" + esc(c.horaInicio) + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Hora de cierre *</label>" +
      "<input id='c-cierre' type='time' value='" + esc(c.horaCierre) + "'></div>" +
      "</div>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Litros por Moto *</label>" +
      "<input id='c-moto' type='number' min='1' step='0.5' value='" + c.cantidadMoto + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Litros por Automóvil *</label>" +
      "<input id='c-auto' type='number' min='1' step='0.5' value='" + c.cantidadAutomovil + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Litros por Camión *</label>" +
      "<input id='c-camion' type='number' min='1' step='0.5' value='" + c.cantidadCamion + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Tiempo de asignación (segundos) *</label>" +
      "<input id='c-tiempo' type='number' min='10' value='" + c.tiempoAsignacionSeg + "'></div>" +
      "</div>" +
      "<div id='c-errores'></div>" +
      "<button id='c-guardar' class='boton'>Guardar configuración</button>" +
      "</div>";
    ORC.$("c-guardar").addEventListener("click", guardarEstacion);
  }

  function guardarEstacion() {
    const config = estado.estacion.config;
    config.combustible = Number(ORC.$("c-combustible").value);
    config.horaInicio = ORC.$("c-inicio").value;
    config.horaCierre = ORC.$("c-cierre").value;
    config.cantidadMoto = Number(ORC.$("c-moto").value);
    config.cantidadAutomovil = Number(ORC.$("c-auto").value);
    config.cantidadCamion = Number(ORC.$("c-camion").value);
    config.tiempoAsignacionSeg = Number(ORC.$("c-tiempo").value);
    config.fecha = estado.estacion.fechaActual();

    const errores = config.validar();
    if (!listarErrores(errores, ORC.$("c-errores"))) return;
    guardar();
    ORC.$("c-errores").innerHTML = "<p class='aviso-ok'>Configuración guardada para el día " +
      config.fecha + ".</p>";
    pintarEstacion();
  }

  ORC.pintores.estacion = pintarEstacion;

})();