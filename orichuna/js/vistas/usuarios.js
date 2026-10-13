"use strict";
/* ============================================================
   ORICHUNA.CA · Vista USUARIOS
   Gestor de usuarios (solo administrador): agregar, editar y
   eliminar cuentas; cada cuenta nueva se verifica con el código
   que se envía por EmailJS.
   ============================================================ */

(function () {

  const { estado, esc, guardar, listarErrores, abrirModalCodigo, enviarEmailReal, pintarNav } = ORC;

  function pintarUsuarios() {
    const lista = estado.estacion.usuarios;
    const filas = lista.map(function (u) {
      const esYoSistema = estado.usuario && u.cedula === estado.usuario.cedula;
      return "<tr>" +
        "<td>" + esc(u.cedula) + "</td>" +
        "<td>" + esc(u.nombreCompleto()) + "</td>" +
        "<td>" + esc(u.correo) + " · " + esc(u.telefono) + "</td>" +
        "<td>" + (u.verificado ? "Verificado" : "Sin verificar") + "</td>" +
        "<td>" + ORC.etiquetaRol(u.rol()) + "</td>" +
        "<td>" +
        "<button class='boton boton-chico boton-secundario' data-editar='" + esc(u.cedula) + "'>Editar</button> " +
        (esYoSistema
          ? "<span class='nota'>usted</span>"
          : "<button class='boton boton-chico boton-peligro' data-borrar='" + esc(u.cedula) + "'>Eliminar</button>") +
        "</td></tr>";
    }).join("");

    const editando = !!estado.usuarioEnEdicion;

    ORC.$("vista-usuarios").innerHTML =
      "<h1 class='titulo'>Gestor de usuarios</h1>" +
      "<p class='subtitulo'>Solo el administrador. Cada cuenta se verifica por correo y/o teléfono antes de guardarse.</p>" +
      "<div class='tarjeta'>" +
      "<h3>" + (editando ? "Modificar usuario" : "Agregar usuario") + "</h3>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Cédula *</label>" +
      "<input id='u-cedula' class='entrada' placeholder='V-12345678' value='" +
      (editando ? esc(estado.usuarioEnEdicion.cedula) : "") + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Nombre * (letras)</label>" +
      "<input id='u-nombre' class='entrada' placeholder='Nombre' value='" +
      (editando ? esc(estado.usuarioEnEdicion.nombre) : "") + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Apellido * (letras)</label>" +
      "<input id='u-apellido' class='entrada' placeholder='Apellido' value='" +
      (editando ? esc(estado.usuarioEnEdicion.apellido) : "") + "'></div>" +
      "</div>" +
      "<div class='filtros'>" +
      "<div class='campo'><label class='etiqueta'>Correo electrónico * (verificado)</label>" +
      "<input id='u-correo' class='entrada' placeholder='persona@correo.com' value='" +
      (editando ? esc(estado.usuarioEnEdicion.correo) : "") + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Teléfono * (verificado)</label>" +
      "<input id='u-telefono' class='entrada' placeholder='0412-1234567' value='" +
      (editando ? esc(estado.usuarioEnEdicion.telefono) : "") + "'></div>" +
      "<div class='campo'><label class='etiqueta'>Tipo de usuario *</label>" +
      "<select id='u-tipo'><option value='administrador'" +
      (editando && estado.usuarioEnEdicion.rol() === "administrador" ? " selected" : "") +
      ">Administrador</option><option value='empleado'" +
      (editando && estado.usuarioEnEdicion.rol() === "empleado" ? " selected" : "") +
      ">Empleado</option><option value='cliente'" +
      (editando && estado.usuarioEnEdicion.rol() === "cliente" ? " selected" : "") +
      ">Cliente</option></select></div>" +
      "</div>" +
      "<div id='u-errores'></div>" +
      "<div class='fila-accion'>" +
      "<button id='u-guardar' class='boton'>" + (editando ? "Actualizar" : "Guardar y verificar") + "</button>" +
      (editando ? "<button id='u-cancelar' class='boton boton-secundario'>Cancelar edición</button>" : "") +
      "</div>" +
      "</div>" +
      "<div class='tabla-wrapper'><table class='tabla'><thead><tr>" +
      "<th>Cédula</th><th>Nombre y apellido</th><th>Correo · Teléfono</th>" +
      "<th>Verificación</th><th>Tipo</th><th>Acciones</th></tr></thead><tbody>" +
      (filas || "<tr><td colspan='6' style='text-align:center;color:#64748b'>Sin usuarios.</td></tr>") +
      "</tbody></table></div>";

    ORC.$("u-guardar").addEventListener("click", guardarUsuario);
    const cancelar = ORC.$("u-cancelar");
    if (cancelar) cancelar.addEventListener("click", function () {
      estado.usuarioEnEdicion = null;
      pintarUsuarios();
    });
    document.querySelectorAll("[data-editar]").forEach(function (b) {
      b.addEventListener("click", function () {
        editarUsuario(b.dataset.editar);
      });
    });
    document.querySelectorAll("[data-borrar]").forEach(function (b) {
      b.addEventListener("click", function () {
        eliminarUsuario(b.dataset.borrar);
      });
    });
  }

  function editarUsuario(cedula) {
    const usuario = estado.estacion.usuarios.find(function (u) {
      return u.cedula === cedula;
    });
    if (!usuario) return;
    estado.usuarioEnEdicion = usuario;
    pintarUsuarios();
  }

  function eliminarUsuario(cedula) {
    if (!confirm("¿Eliminar este usuario?")) return;
    estado.estacion.eliminarUsuario(cedula);
    guardar();
    pintarUsuarios();
  }

  function datosUsuarioForm() {
    return {
      cedula: ORC.$("u-cedula").value.trim(),
      nombre: ORC.$("u-nombre").value.trim(),
      apellido: ORC.$("u-apellido").value.trim(),
      correo: ORC.$("u-correo").value.trim(),
      telefono: ORC.$("u-telefono").value.trim(),
      tipo: ORC.$("u-tipo").value
    };
  }

  function construirUsuario(datos) {
    const PorTipo = {
      administrador: Administrador,
      empleado: Empleado,
      cliente: Cliente
    };
    const UsuarioTipo = PorTipo[datos.tipo] || Administrador;
    return new UsuarioTipo(datos.cedula, datos.nombre, datos.apellido,
      datos.correo, datos.telefono);
  }

  function guardarUsuario() {
    const datos = datosUsuarioForm();
    const modelo = construirUsuario(datos);
    const errores = modelo.validar();
    if (!datos.tipo) errores.push("Seleccione el tipo de usuario.");
    if (!listarErrores(errores, ORC.$("u-errores"))) return;

    if (estado.usuarioEnEdicion) {
      const resultado = estado.estacion.actualizarUsuario(
        estado.usuarioEnEdicion.cedula, modelo);
      if (resultado) {
        listarErrores([resultado], ORC.$("u-errores"));
        return;
      }
      estado.usuarioEnEdicion = null;
      guardar();
      pintarUsuarios();
      return;
    }

    estado.usuarioPendienteVerificar = modelo;
    abrirModalCodigo({
      titulo: "Verificación de la cuenta",
      destino: "Código enviado a: " + datos.correo + " / " + datos.telefono,
      nota: "El código también llegó a " + datos.correo + " (EmailJS).",
      enviar: function (codigo) {
        enviarEmailReal(datos.correo, "Verificación de tu cuenta ORICHUNA.CA",
          "Tu código de verificación de ORICHUNA.CA es " + codigo +
          ". Completa el registro en la pantalla (si no lo solicitaste, ignora este mensaje).");
      },
      alAceptar: function (codigo, codigoGenerado) {
        if (codigo !== codigoGenerado) {
          throw new Error("Código incorrecto. La cuenta no se guardó.");
        }
        const usuario = estado.usuarioPendienteVerificar;
        estado.usuarioPendienteVerificar = null;
        usuario.verificado = true;
        const resultado = estado.estacion.agregarUsuario(usuario);
        if (resultado) {
          alert(resultado);
          return;
        }
        guardar();
        pintarUsuarios();
        pintarNav();
      }
    });
  }

  ORC.pintores.usuarios = pintarUsuarios;

})();