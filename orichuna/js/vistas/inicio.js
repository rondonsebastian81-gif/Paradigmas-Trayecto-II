"use strict";
/* ============================================================
   ORICHUNA.CA · Vista INICIO
   Resumen de la estación y caja "Modelo de clases (POO)".
   Registra su pintor en ORC.pintores.inicio.
   ============================================================ */

(function () {

  const { estado, esc } = ORC;

  function pooCaja() {
    return "<div class='tarjeta caja-poo'>" +
      "<h3>Modelo de clases (POO)</h3>" +
      "<p><b>Herencia:</b> <code>Usuario</code> → <code>Administrador</code>, <code>Empleado</code> y <code>Cliente</code>; " +
      "<code>Vehiculo</code> → <code>Moto</code>, <code>Automovil</code> y <code>Camion</code>.</p>" +
      "<p><b>Polimorfismo:</b> el mismo método se comporta distinto según el objeto:</p>" +
      "<pre>vehiculo.obtenerCombustible(config)  // Moto devuelve config.cantidadMoto\n" +
      "                                      // Automovil devuelve config.cantidadAutomovil\n" +
      "                                      // Camion devuelve config.cantidadCamion\n" +
      "usuario.rol()   // 'administrador' | 'empleado'\n" +
      "usuario.puede(a)// el admin puede todo; el empleado no gestiona usuarios</pre>" +
      "<p><b>Clases auxiliares:</b> <code>Validador</code> (validación de datos), " +
      "<code>FabricaVehiculos</code> (crea el subtipo según el tipo elegido), " +
      "<code>ConfiguracionDistribucion</code>, <code>Ticket</code>, " +
      "<code>EstacionServicio</code> y <code>Almacenamiento</code> (guarda todo en el navegador).</p>" +
      "</div>";
  }

  function pintarInicio() {
    const est = estado.estacion;
    const hoy = est.fechaActual();
    const ayer = est.config.fecha !== hoy;

    const aceptados = est.tickets.filter(function (t) {
      return t.estatus === "aceptado" && aISO(t.fecha) === hoy;
    });
    const cancelados = est.tickets.filter(function (t) {
      return t.estatus === "cancelado" && aISO(t.fecha) === hoy;
    });

    ORC.$("vista-inicio").innerHTML =
      "<h1 class='titulo'>Inicio</h1>" +
      "<p class='subtitulo'>Resumen de la estación para el día " + hoy + ".</p>" +
      (ayer
        ? "<div class='aviso-bloqueo'>La configuración corresponde al día " +
          esc(est.config.fecha) + ". Actualícela en el módulo Surtir estación.</div>"
        : "") +
      "<div class='grilla-stats'>" +
      "<div class='stat'><div class='n'>" + est.config.combustible + "</div><div class='t'>L de combustible restante</div></div>" +
      "<div class='stat'><div class='n'>" + est.turnosRestantes() + "</div><div class='t'>Turnos disponibles (de 20)</div></div>" +
      "<div class='stat'><div class='n'>" + aceptados.length + "</div><div class='t'>Tickets aceptados hoy</div></div>" +
      "<div class='stat'><div class='n'>" + cancelados.length + "</div><div class='t'>Tickets cancelados hoy</div></div>" +
      "<div class='stat'><div class='n'>" + est.totalCombustibleAsignado() + "</div><div class='t'>L asignados en total</div></div>" +
      "</div>" +
      "<div class='tarjeta'>" +
      "<h3>Estación hoy</h3>" +
      "<p>Horario de asignación: <b>" + esc(est.config.rangoHorario()) + "</b> · " +
      (est.config.enHorario() ? "en horario" : "fuera de horario") + ".</p>" +
      "<p>Litros por tipo: Moto " + est.config.cantidadMoto + " L · Automóvil " +
      est.config.cantidadAutomovil + " L · Camión " + est.config.cantidadCamion + " L.</p>" +
      "<p>Tiempo límite de asignación: " + est.config.tiempoAsignacionSeg + " segundos.</p>" +
      "</div>" +
      pooCaja();
  }

  ORC.pintores.inicio = pintarInicio;

})();