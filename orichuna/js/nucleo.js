"use strict";
/* ============================================================
   ORICHUNA.CA · Módulo NÚCLEO
   Estado global, utilidades compartidas, login, navegación,
   modal de verificación y envío real por EmailJS.
   Expone el objeto global `ORC` con la API que usan los
   módulos de cada vista (js/vistas/*.js).
   ============================================================ */

(function () {

  function $(id) { return document.getElementById(id); }

  function esc(texto) {
    return String(texto === null || texto === undefined ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function dos(n) { return String(n).padStart(2, "0"); }

  function formatearFecha(f) {
    return dos(f.getDate()) + "/" + dos(f.getMonth() + 1) + "/" +
      f.getFullYear() + " " + dos(f.getHours()) + ":" + dos(f.getMinutes());
  }

  const almacenamiento = new Almacenamiento("orichuna_datos_v1");

  const estado = {
    estacion: null,
    usuario: null,
    rol: null,
    ticketActual: null,
    resultadoActual: null,
    intervaloTimer: null,
    segundosRestantes: 0,
    modalDatos: null,
    usuarioEnEdicion: null,
    usuarioPendienteVerificar: null
  };

  function guardar() {
    almacenamiento.guardar(estado.estacion);
  }

  /* ---------- Envío real por EmailJS (con respaldo simulado) ---------- */

  const CLAVE_EMAILJS = "orichuna_emailjs_v1";

  const EMAILJS_DEFAULT = {
    publicKey: "E4ZVYRex-GI1bZ3Pi",
    serviceId: "service_sheu5qt",
    templateId: "template_prnss68"
  };

  function cargarConfigEmail() {
    try {
      const texto = localStorage.getItem(CLAVE_EMAILJS);
      const cfg = texto ? JSON.parse(texto) : {};
      return {
        publicKey: String(cfg.publicKey || "").trim() || EMAILJS_DEFAULT.publicKey,
        serviceId: String(cfg.serviceId || "").trim() || EMAILJS_DEFAULT.serviceId,
        templateId: String(cfg.templateId || "").trim() || EMAILJS_DEFAULT.templateId
      };
    } catch (e) {
      return EMAILJS_DEFAULT;
    }
  }

  function enviarEmailReal(destinatario, asunto, contenido) {
    const cfg = cargarConfigEmail();
    if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
      return Promise.resolve({ enviado: false, motivo: "EmailJS no configurado." });
    }
    if (typeof window.emailjs === "undefined") {
      return Promise.resolve({ enviado: false, motivo: "Sin conexión a EmailJS." });
    }
    return window.emailjs.send(
      cfg.serviceId, cfg.templateId,
      { to_email: destinatario, subject: asunto, message: contenido },
      { publicKey: cfg.publicKey }
    ).then(
      function (r) { return { enviado: true, motivo: r.status + " " + r.text }; },
      function (e) { return { enviado: false, motivo: e && e.message ? e.message : String(e) }; }
    );
  }

  function listarErrores(lista, destino) {
    destino.innerHTML = "";
    if (!lista.length) return true;
    const ul = document.createElement("ul");
    ul.className = "errores";
    lista.forEach(function (msg) {
      const li = document.createElement("li");
      li.textContent = msg;
      ul.appendChild(li);
    });
    destino.appendChild(ul);
    return false;
  }

  /* ---------- Ticket genérico (usado por Asignación y Búsqueda) ---------- */

  function htmlTicket(t) {
    const aceptado = t.estatus === "aceptado";
    const bloqueInfo = aceptado
      ? "Tipo de vehículo: <b>" + esc(t.vehiculo.nombreTipo()) +
        "</b> · Combustible asignado: <b>" + t.combustible + " L</b>"
      : "Motivo de cancelación: <b>" + esc(t.motivo) + "</b>";
    const chip = "<span class='chip chip-" + t.estatus + "'>" + t.estatus + "</span>";
    return "<div class='ticket'>" +
      "<div class='ticket-enc'>" +
      "<div><b>ORICHUNA.CA</b><br><small>Estación de Servicios</small></div>" +
      "<div class='ticket-fecha'>Emitido: " + formatearFecha(t.fecha) + "</div>" +
      "</div>" +
      "<div class='ticket-cuerpo'>" +
      "<div class='ticket-turno'>#" + dos(t.turno) + "</div>" +
      "<div class='ticket-datos'>" +
      "<p>Placa: <b>" + esc(t.vehiculo.placa) + "</b> · Color: <b>" +
      esc(t.vehiculo.color) + "</b> · Modelo: <b>" + esc(t.vehiculo.modelo) +
      "</b><br>Marca: <b>" + esc(t.vehiculo.marca) + "</b></p>" +
      "<p>" + chip + "</p>" +
      "<p>" + bloqueInfo + "</p>" +
      "</div>" +
      "</div>" +
      "<div class='ticket-codigo'><small>Código de verificación</small>" +
      "<div class='codigo-g'>" + String(t.codigo).padStart(3, "0") + "</div></div>" +
      "</div>";
  }

  const MODULOS = [
    { clave: "inicio", etiqueta: "Inicio", roles: ["administrador", "empleado"] },
    { clave: "asignacion", etiqueta: "Asignación de cupo", roles: ["administrador", "empleado", "cliente"] },
    { clave: "tickets", etiqueta: "Tickets", roles: ["administrador", "empleado"] },
    { clave: "estacion", etiqueta: "Surtir estación", roles: ["administrador", "empleado"] },
    { clave: "usuarios", etiqueta: "Usuarios", roles: ["administrador"] },
    { clave: "reportes", etiqueta: "Reportes", roles: ["administrador", "empleado"] },
    { clave: "busqueda", etiqueta: "Búsqueda", roles: ["administrador", "empleado"] }
  ];

  const ETIQUETA_ROL = {
    administrador: "Administrador",
    empleado: "Empleado",
    cliente: "Cliente"
  };

  /* =============================== INICIO =============================== */

  function iniciar() {
    estado.estacion = almacenamiento.cargar();
    if (!estado.estacion) {
      estado.estacion = new EstacionServicio();
      const admin = new Administrador(
        "V-12345678", "Administrador", "Principal",
        "rondonsebastian81@gmail.com", "0412-0000000");
      admin.verificado = true;
      estado.estacion.agregarUsuario(admin);
      const emp = new Empleado(
        "V-87654321", "Pedro", "López",
        "empleado@orichuna.com", "0424-1112233");
      emp.verificado = true;
      estado.estacion.agregarUsuario(emp);
      guardar();
    }
    finalizarPendientes();
    configurarApp();
    pintarLogin();
  }

  function finalizarPendientes() {
    let cambios = false;
    estado.estacion.tickets.forEach(function (t) {
      if (t.estatus === "pendiente") {
        t.cancelar("Tiempo de espera agotado (la sesión se cerró o recargó la página).");
        cambios = true;
      }
    });
    if (cambios) guardar();
  }

  /* =============================== LOGIN =============================== */

  function pintarLogin() {
    $("pantalla-app").classList.add("oculto");
    $("pantalla-login").classList.remove("oculto");
    $("login-error").textContent = "";
    $("login-id").value = "";
    $("clogin-error").textContent = "";
    $("c-errores").innerHTML = "";
  }

  function configurarApp() {
    $("btn-salir").addEventListener("click", salir);
    $("btn-codigo").addEventListener("click", enviarCodigo);
    $("btn-cliente").addEventListener("click", entrarCliente);
    $("tab-cuenta").addEventListener("click", function () {
      $("tab-cuenta").classList.add("activo");
      $("tab-cliente").classList.remove("activo");
      $("panel-cuenta").classList.remove("oculto");
      $("panel-cliente").classList.add("oculto");
    });
    $("tab-cliente").addEventListener("click", function () {
      $("tab-cliente").classList.add("activo");
      $("tab-cuenta").classList.remove("activo");
      $("panel-cliente").classList.remove("oculto");
      $("panel-cuenta").classList.add("oculto");
    });
    $("btn-reset-login").addEventListener("click", reiniciarDemo);

    $("modal-cancelar").addEventListener("click", cerrarModal);
    $("modal-aceptar").addEventListener("click", confirmarModal);

    $("login-id").addEventListener("keydown", function (e) {
      if (e.key === "Enter") enviarCodigo();
    });
    $("clogin-id").addEventListener("keydown", function (e) {
      if (e.key === "Enter") enviarCodigoCliente();
    });
    $("btn-registrar-cliente").addEventListener("click", registrarCliente);
    $("btn-codigo-cliente").addEventListener("click", enviarCodigoCliente);
  }

  function reiniciarDemo() {
    if (!confirm("Se borrarán todos los datos y se volverá al estado inicial. ¿Continuar?")) return;
    ORC.detenerTemporizador();
    almacenamiento.limpiar();
    location.reload();
  }

  function enviarCodigo() {
    const identificador = $("login-id").value.trim();
    $("login-error").textContent = "";
    if (!identificador) {
      $("login-error").textContent = "Escriba su correo o teléfono.";
      return;
    }
    const usuario = estado.estacion.buscarUsuarioPorIdentificador(identificador);
    if (!usuario) {
      $("login-error").textContent =
        "No existe un usuario verificado con ese correo o teléfono.";
      return;
    }
    if (usuario.rol() === "cliente") {
      $("login-error").textContent =
        "Ese correo pertenece a una cuenta de cliente. Use la pestaña Cliente.";
      return;
    }
    abrirModalCodigo({
      titulo: "Verificación de acceso",
      destino: "Código enviado a: " + identificador,
      nota: "El código también llegó a " + usuario.correo + " (EmailJS).",
      enviar: function (codigo) {
        enviarEmailReal(usuario.correo, "Código de acceso ORICHUNA.CA",
          "Código de acceso a ORICHUNA.CA: " + codigo +
          " (si no lo solicitaste, ignora este mensaje).");
      },
      alAceptar: function (codigo, codigoGenerado) {
        if (codigo !== codigoGenerado) {
          throw new Error("Código incorrecto. Verifique e intente de nuevo.");
        }
        abrirSesion(usuario);
      }
    });
  }

  function abrirSesion(usuario) {
    estado.usuario = usuario;
    estado.rol = usuario.rol();
    estado.resultadoActual = null;
    $("pantalla-login").classList.add("oculto");
    $("pantalla-app").classList.remove("oculto");
    $("chip-rol").textContent = ETIQUETA_ROL[estado.rol];
    $("chip-usuario").textContent = "Usuario: " + usuario.nombreCompleto();
    pintarNav();
    navegar(estado.rol === "cliente" ? "asignacion" : "inicio");
  }

  function entrarCliente() {
    estado.usuario = null;
    estado.rol = "cliente";
    estado.resultadoActual = null;
    $("pantalla-login").classList.add("oculto");
    $("pantalla-app").classList.remove("oculto");
    $("chip-rol").textContent = "Cliente";
    $("chip-usuario").textContent = "Acceso público";
    pintarNav();
    navegar("asignacion");
  }

  function registrarCliente() {
    $("c-errores").innerHTML = "";
    const cliente = new Cliente(
      $("c-cedula").value.trim(),
      $("c-nombre").value.trim(),
      $("c-apellido").value.trim(),
      $("c-correo").value.trim(),
      $("c-telefono").value.trim());
    const errores = cliente.validar();
    if (!listarErrores(errores, $("c-errores"))) return;
    if (estado.estacion.usuarios.some(function (u) {
      return u.cedula === cliente.cedula;
    })) {
      listarErrores(["Ya existe un usuario con esa cédula."], $("c-errores"));
      return;
    }
    $("c-correo").setAttribute("disabled", "disabled");
    abrirModalCodigo({
      titulo: "Verificación de tu cuenta",
      destino: "Código enviado a: " + cliente.correo,
      nota: "El código también llegó a " + cliente.correo + " (EmailJS).",
      enviar: function (codigo) {
        enviarEmailReal(cliente.correo, "Verificación de tu cuenta ORICHUNA.CA",
          "Tu código de verificación de ORICHUNA.CA es " + codigo +
          ". Completa el registro en la pantalla (si no lo solicitaste, ignora este mensaje).");
      },
      alCancelar: function () {
        $("c-correo").removeAttribute("disabled");
      },
      alAceptar: function (codigo, codigoGenerado) {
        if (codigo !== codigoGenerado) {
          throw new Error("Código incorrecto. Intente de nuevo.");
        }
        $("c-correo").removeAttribute("disabled");
        cliente.verificado = true;
        const resultado = estado.estacion.agregarUsuario(cliente);
        if (resultado) {
          listarErrores([resultado], $("c-errores"));
          return;
        }
        guardar();
        abrirSesion(cliente);
      }
    });
  }

  function enviarCodigoCliente() {
    const identificador = $("clogin-id").value.trim();
    $("clogin-error").textContent = "";
    if (!identificador) {
      $("clogin-error").textContent = "Escriba su correo o teléfono.";
      return;
    }
    const cliente = estado.estacion.buscarUsuarioPorIdentificador(identificador);
    if (!cliente) {
      $("clogin-error").textContent =
        "No existe una cuenta de cliente verificada con ese correo o teléfono. Regístrese primero.";
      return;
    }
    if (cliente.rol() !== "cliente") {
      $("clogin-error").textContent =
        "Ese correo pertenece a una cuenta de administrador o empleado. Use la pestaña Administrador / Empleado.";
      return;
    }
    abrirModalCodigo({
      titulo: "Verificación de acceso (cliente)",
      destino: "Código enviado a: " + identificador,
      nota: "El código también llegó a " + cliente.correo + " (EmailJS).",
      enviar: function (codigo) {
        enviarEmailReal(cliente.correo, "Código de acceso ORICHUNA.CA",
          "Código de acceso a ORICHUNA.CA: " + codigo +
          " (si no lo solicitaste, ignora este mensaje).");
      },
      alAceptar: function (codigo, codigoGenerado) {
        if (codigo !== codigoGenerado) {
          throw new Error("Código incorrecto. Verifique e intente de nuevo.");
        }
        abrirSesion(cliente);
      }
    });
  }

  function salir() {
    if (estado.ticketActual) {
      estado.ticketActual.cancelar("Sesión finalizada antes de confirmar la asignación.");
      estado.ticketActual = null;
      guardar();
    }
    ORC.detenerTemporizador();
    estado.usuario = null;
    estado.rol = null;
    estado.resultadoActual = null;
    pintarLogin();
  }

  /* ========================== NAVEGACIÓN ========================== */

  function modulosVisibles() {
    if (estado.rol === "cliente") {
      return MODULOS.filter(function (m) { return m.clave === "asignacion"; });
    }
    return MODULOS.filter(function (m) { return m.roles.indexOf(estado.rol) !== -1; });
  }

  function pintarNav() {
    const nav = $("nav");
    nav.innerHTML = "";
    modulosVisibles().forEach(function (m) {
      const btn = document.createElement("button");
      btn.textContent = m.etiqueta;
      btn.dataset.vista = m.clave;
      nav.appendChild(btn);
    });
    const botones = nav.querySelectorAll("button");
    botones.forEach(function (b) {
      b.addEventListener("click", function () {
        navegar(b.dataset.vista);
      });
    });
  }

  function navegar(vista) {
    const visibles = modulosVisibles();
    const permitida = visibles.some(function (m) { return m.clave === vista; });
    if (!permitida) {
      vista = estado.rol === "cliente" ? "asignacion" : "inicio";
    }
    const secciones = document.querySelectorAll(".vista");
    secciones.forEach(function (s) {
      s.classList.toggle("activa", s.id === "vista-" + vista);
    });
    const botones = $("nav").querySelectorAll("button");
    botones.forEach(function (b) {
      b.classList.toggle("activo", b.dataset.vista === vista);
    });
    const pintor = ORC.pintores[vista];
    if (typeof pintor === "function") pintor();
  }

  /* ============================= MODAL ============================= */

  function abrirModalCodigo(datos) {
    const codigo = String(Math.floor(1000 + Math.random() * 9000));
    estado.modalDatos = {
      codigoGenerado: codigo,
      alAceptar: datos.alAceptar,
      alCancelar: datos.alCancelar || null
    };
    $("modal-titulo").textContent = datos.titulo || "Verificación";
    $("modal-destino").textContent = datos.destino || "";
    $("modal-nota").textContent = datos.nota ||
      "Demostración: el código aparece aquí y la cuenta correspondiente también lo recibe por correo.";
    $("modal-codigo").textContent = codigo;
    $("modal-input").value = "";
    $("modal-error").textContent = "";
    $("modal").classList.remove("oculto");
    if (typeof datos.enviar === "function") {
      try { datos.enviar(codigo); } catch (e) { /* la UI no debe romperse por el envío */ }
    }
    setTimeout(function () { $("modal-input").focus(); }, 50);
  }

  function cerrarModal() {
    const datos = estado.modalDatos;
    $("modal").classList.add("oculto");
    estado.modalDatos = null;
    estado.usuarioPendienteVerificar = null;
    if (datos && typeof datos.alCancelar === "function") {
      datos.alCancelar();
    }
  }

  function confirmarModal() {
    if (!estado.modalDatos) return;
    const codigo = $("modal-input").value.trim();
    if (!/^\d{4}$/.test(codigo)) {
      $("modal-error").textContent = "El código tiene 4 dígitos.";
      return;
    }
    try {
      const aceptar = estado.modalDatos.alAceptar;
      const codigoGenerado = estado.modalDatos.codigoGenerado;
      $("modal").classList.add("oculto");
      estado.modalDatos = null;
      estado.usuarioPendienteVerificar = null;
      aceptar(codigo, codigoGenerado);
    } catch (e) {
      $("modal").classList.remove("oculto");
      $("modal-error").textContent = e.message;
    }
  }

  /* ---------- API pública del núcleo ---------- */

  window.ORC = {
    $: $,
    esc: esc,
    dos: dos,
    formatearFecha: formatearFecha,
    guardar: guardar,
    listarErrores: listarErrores,
    estado: estado,
    etiquetaRol: function (rol) { return ETIQUETA_ROL[rol] || rol; },
    abrirModalCodigo: abrirModalCodigo,
    pintarNav: pintarNav,
    navegar: navegar,
    enviarEmailReal: enviarEmailReal,
    htmlTicket: htmlTicket,
    pintores: {},
    detenerTemporizador: function () {},
    reiniciar: reiniciarDemo
  };

  window.addEventListener("load", iniciar);

})();