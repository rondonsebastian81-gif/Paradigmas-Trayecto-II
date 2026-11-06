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

  function pintarEstacion(mensaje) {
    const c = estado.estacion.config;
    ORC.$("vista-estacion").innerHTML =
      "<h1 class='titulo'>Surtir estación</h1>" +
      "<p class='subtitulo'>Configuración diaria del combustible. Campos obligatorios y validados.</p>" +
      "<div class='grilla-stats'>" +
      "<div class='stat'><div class='n'>" + stateFuel() + "</div><div class='t'>L para el día " + esc(c.fecha) + "</div></div>" +
      "</div>" +
      "<div class='tarjeta'>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Cantidad de combustible del día (L) *</label>" +
      "<input id='c-combustible' type='number' min='0' max='1000000' step='0.01' value='" + c.combustible + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Hora de inicio *</label>" +
      "<input id='c-inicio' type='time' value='" + esc(c.horaInicio) + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Hora de cierre *</label>" +
      "<input id='c-cierre' type='time' value='" + esc(c.horaCierre) + "'></div>" +
      "</div>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Máximo de litros por Moto *</label>" +
      "<input id='c-moto' type='number' min='0.5' max='1000' step='0.01' value='" + c.cantidadMoto + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Máximo de litros por Automóvil *</label>" +
      "<input id='c-auto' type='number' min='0.5' max='1000' step='0.01' value='" + c.cantidadAutomovil + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Máximo de litros por Camión *</label>" +
      "<input id='c-camion' type='number' min='0.5' max='1000' step='0.01' value='" + c.cantidadCamion + "'></div>" +
      "</div>" +
      "<p class='nota'>El cliente elige cuántos litros solicitar hasta el máximo de su tipo de vehículo. " +
      "La hora de recogida se reparte automáticamente entre la hora de inicio y la de cierre.</p>" +
      "<div id='c-errores'>" + (mensaje || "") + "</div>" +
      "<button id='c-guardar' class='boton'>Guardar configuración</button>" +
      "</div>";
    ORC.$("c-guardar").addEventListener("click", guardarEstacion);
  }

  /* Lee el formulario sin tocar la configuración vigente. Así, si algún
     valor es inválido, la estación conserva los datos anteriores. */
  function leerValores() {
    return {
      fecha: estado.estacion.fechaActual(),
      combustible: ORC.$("c-combustible").value,
      horaInicio: ORC.$("c-inicio").value,
      horaCierre: ORC.$("c-cierre").value,
      cantidadMoto: ORC.$("c-moto").value,
      cantidadAutomovil: ORC.$("c-auto").value,
      cantidadCamion: ORC.$("c-camion").value,
      tiempoAsignacionSeg: estado.estacion.config.tiempoAsignacionSeg
    };
  }

  function guardarEstacion() {
    // Se valida sobre un borrador: si hay errores (por ejemplo un número
    // negativo) no se modifica nada ni se guarda nada.
    const borrador = new ConfiguracionDistribucion();
    Object.assign(borrador, leerValores());
    const errores = borrador.validar();
    if (!listarErrores(errores, ORC.$("c-errores"))) return;

    borrador.normalizar();
    Object.assign(estado.estacion.config, borrador);
    guardar();
    pintarEstacion("<p class='aviso-ok'>Configuración guardada para el día " +
      esc(estado.estacion.config.fecha) + ".</p>");
  }

  ORC.pintores.estacion = pintarEstacion;

})();
