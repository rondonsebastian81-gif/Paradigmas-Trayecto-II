"use strict";

const NOMBRES_TIPO = { moto: "Moto", automovil: "Automóvil", camion: "Camión" };

function aISO(fecha) {
  return fecha.getFullYear() + "-" +
    String(fecha.getMonth() + 1).padStart(2, "0") + "-" +
    String(fecha.getDate()).padStart(2, "0");
}

const RE_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’.\s-]+$/;
const RE_ALFANUMERICO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ'’.\s+-]+$/;

function limpiarEspacios(texto) {
  return String(texto === null || texto === undefined ? "" : texto)
    .replace(/\s+/g, " ")
    .trim();
}

/* Mensaje neutro para campos vacíos (evita errores de género como
   "La cantidad ... es obligatorio"). */
function campoObligatorio(campo) {
  const nombre = String(campo).replace(/^(La|El|Los|Las)\s+/i, "");
  return "El campo «" + nombre + "» es obligatorio.";
}

class Validador {
  /* Normaliza la cédula para que "v12345678", "V 12345678" y
     "V-12345678" se consideren el mismo valor. */
  static normalizarCedula(texto) {
    const base = String(texto === null || texto === undefined ? "" : texto)
      .trim().toUpperCase().replace(/[\s.]/g, "");
    const m = /^([VEJ])?-?(\d{6,9})$/.exec(base);
    return m ? (m[1] ? m[1] + "-" : "") + m[2] : base;
  }

  static validarCedula(texto) {
    const t = Validador.normalizarCedula(texto);
    if (!t) return "La cédula es obligatoria.";
    if (t.length > 20) return "La cédula no puede superar 20 caracteres.";
    if (!/^([VEJ]-?)?\d{6,9}$/.test(t))
      return "Cédula inválida (ej.: V-12345678: una letra opcional y 6 a 9 dígitos).";
    return "";
  }

  static validarLetras(texto, campo, maximo) {
    const t = limpiarEspacios(texto);
    const limite = maximo === undefined ? 80 : maximo;
    if (!t) return campoObligatorio(campo);
    if (t.length > limite) return campo + " no puede superar " + limite + " caracteres.";
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(t))
      return campo + " debe contener al menos una letra.";
    if (!RE_LETRAS.test(t))
      return campo + " solo debe contener letras (sin números ni símbolos).";
    return "";
  }

  static validarAlfanumerico(texto, campo, maximo) {
    const t = limpiarEspacios(texto);
    const limite = maximo === undefined ? 80 : maximo;
    if (!t) return campoObligatorio(campo);
    if (t.length > limite) return campo + " no puede superar " + limite + " caracteres.";
    if (!/[A-Za-z0-9]/.test(t))
      return campo + " debe contener al menos una letra o un número.";
    if (!RE_ALFANUMERICO.test(t))
      return campo + " solo debe contener letras, números, espacios y los signos + - . '";
    return "";
  }

  static validarPlaca(texto) {
    const t = String(texto === null || texto === undefined ? "" : texto)
      .trim().toUpperCase().replace(/[\s-]/g, "");
    if (!t) return "La placa es obligatoria.";
    if (t.length > 10) return "La placa no puede superar 10 caracteres.";
    if (!/^[A-Z0-9]{6,8}$/.test(t))
      return "La placa debe tener entre 6 y 8 caracteres alfanuméricos (ej.: ABC123).";
    if (!/[A-Z]/.test(t) || !/[0-9]/.test(t))
      return "La placa debe combinar letras y números (ej.: ABC123).";
    return "";
  }

  static validarEmail(texto) {
    const t = String(texto === null || texto === undefined ? "" : texto).trim();
    if (!t) return "El correo es obligatorio.";
    if (t.length > 150) return "El correo no puede superar 150 caracteres.";
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(t))
      return "Correo electrónico inválido (ej.: persona@correo.com).";
    if (/\.\./.test(t) || /^\./.test(t) || /\.@/.test(t))
      return "Correo electrónico inválido (puntos mal ubicados).";
    return "";
  }

  static validarTelefono(texto) {
    const t = String(texto === null || texto === undefined ? "" : texto).trim();
    if (!t) return "El teléfono es obligatorio.";
    if (t.length > 30) return "El teléfono no puede superar 30 caracteres.";
    if (!/^\+?[0-9 ()\-]+$/.test(t))
      return "Teléfono inválido: use solo números, espacios, paréntesis, guion o +.";
    const d = t.replace(/\D/g, "");
    if (d.length < 7 || d.length > 15)
      return "El teléfono debe tener entre 7 y 15 dígitos (ej.: 0412-1234567).";
    return "";
  }

  /* Valida números. Opciones: { positivo, min, max, entero, decimales }.
     Rechaza vacíos, texto, NaN, infinitos, negativos y fuera de rango. */
  static validarNumero(valor, campo, opciones) {
    const o = opciones || {};
    const texto = String(valor === null || valor === undefined ? "" : valor).trim();
    if (texto === "") return campoObligatorio(campo);
    if (!/^-?\d+(\.\d+)?$/.test(texto))
      return campo + " debe ser un número válido (sin letras ni símbolos).";
    const n = Number(texto);
    if (!Number.isFinite(n)) return campo + " debe ser un número válido.";
    if (o.entero && !Number.isInteger(n)) return campo + " debe ser un número entero.";
    if (o.positivo && !(n > 0)) return campo + " debe ser un número mayor que 0.";
    if (o.min !== undefined && n < o.min)
      return campo + " debe ser mayor o igual que " + o.min + ".";
    if (o.max !== undefined && n > o.max)
      return campo + " no puede ser mayor que " + o.max + ".";
    if (o.decimales !== undefined) {
      const escritos = (texto.split(".")[1] || "").length;
      if (escritos > o.decimales)
        return campo + " admite como máximo " + o.decimales + " decimales.";
    }
    return "";
  }

  static validarPositivo(valor, campo) {
    return Validador.validarNumero(valor, campo, { positivo: true });
  }

  static validarHora(texto, campo) {
    const t = String(texto === null || texto === undefined ? "" : texto).trim();
    if (!t) return campo + " es obligatoria.";
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(t))
      return campo + " debe ser una hora válida en formato HH:MM (00:00 a 23:59).";
    return "";
  }

  /* Limpia un texto libre (motivos de cancelación): un solo espacio entre
     palabras y recorte al largo que admite la base de datos. */
  static normalizarMotivo(texto, maximo) {
    const limite = maximo === undefined ? 255 : maximo;
    return limpiarEspacios(texto).slice(0, limite);
  }

  static validarMotivo(texto, maximo) {
    const limite = maximo === undefined ? 255 : maximo;
    if (limpiarEspacios(texto).length > limite)
      return "El motivo no puede superar " + limite + " caracteres.";
    return "";
  }
}

class Usuario {
  constructor(cedula, nombre, apellido, correo, telefono) {
    this.cedula = Validador.normalizarCedula(cedula);
    this.nombre = limpiarEspacios(nombre);
    this.apellido = limpiarEspacios(apellido);
    this.correo = String(correo === null || correo === undefined ? "" : correo).trim();
    this.telefono = String(telefono === null || telefono === undefined ? "" : telefono).trim();
    this.verificado = false;
  }

  nombreCompleto() {
    return (this.nombre + " " + this.apellido).trim();
  }

  validar() {
    const errores = [];
    errores.push(Validador.validarCedula(this.cedula));
    errores.push(Validador.validarLetras(this.nombre, "El nombre"));
    errores.push(Validador.validarLetras(this.apellido, "El apellido"));
    errores.push(Validador.validarEmail(this.correo));
    errores.push(Validador.validarTelefono(this.telefono));
    return errores.filter(Boolean);
  }

  rol() { return "usuario"; }

  puede(accion) { return false; }
}

class Administrador extends Usuario {
  rol() { return "administrador"; }

  puede(accion) { return true; }
}

class Empleado extends Usuario {
  rol() { return "empleado"; }

  puede(accion) {
    return accion !== "gestion_usuarios";
  }
}

class Cliente extends Usuario {
  rol() { return "cliente"; }

  puede(accion) {
    return accion === "asignar";
  }
}

class Vehiculo {
  constructor(tipo, marca, modelo, placa, color) {
    this.tipo = tipo;
    this.marca = limpiarEspacios(marca);
    this.modelo = limpiarEspacios(modelo);
    this.placa = String(placa === null || placa === undefined ? "" : placa)
      .trim().toUpperCase().replace(/[\s-]/g, "");
    this.color = limpiarEspacios(color);
  }

  nombreTipo() { return NOMBRES_TIPO[this.tipo] || this.tipo; }

  linea() {
    return this.nombreTipo() + " · " + this.marca + " " + this.modelo +
      " · Placa " + this.placa + " · " + this.color;
  }

  validar() {
    const errores = [];
    if (!NOMBRES_TIPO[this.tipo]) errores.push("Seleccione el tipo de vehículo.");
    errores.push(Validador.validarLetras(this.marca, "La marca", 80));
    errores.push(Validador.validarAlfanumerico(this.modelo, "El modelo", 80));
    errores.push(Validador.validarPlaca(this.placa));
    errores.push(Validador.validarLetras(this.color, "El color", 60));
    return errores.filter(Boolean);
  }

  obtenerCombustible(config) { return 0; }
}

class Moto extends Vehiculo {
  constructor(marca, modelo, placa, color) {
    super("moto", marca, modelo, placa, color);
  }

  obtenerCombustible(config) { return config.cantidadMoto; }
}

class Automovil extends Vehiculo {
  constructor(marca, modelo, placa, color) {
    super("automovil", marca, modelo, placa, color);
  }

  obtenerCombustible(config) { return config.cantidadAutomovil; }
}

class Camion extends Vehiculo {
  constructor(marca, modelo, placa, color) {
    super("camion", marca, modelo, placa, color);
  }

  obtenerCombustible(config) { return config.cantidadCamion; }
}

class FabricaVehiculos {
  static crear(tipo, marca, modelo, placa, color) {
    switch (tipo) {
      case "moto": return new Moto(marca, modelo, placa, color);
      case "automovil": return new Automovil(marca, modelo, placa, color);
      case "camion": return new Camion(marca, modelo, placa, color);
      default: throw new Error("Tipo de vehículo desconocido: " + tipo);
    }
  }
}

class ConfiguracionDistribucion {
  constructor() {
    this.fecha = aISO(new Date());
    this.combustible = 1000;
    this.horaInicio = "07:00";
    this.horaCierre = "15:00";
    this.cantidadMoto = 2;
    this.cantidadAutomovil = 5;
    this.cantidadCamion = 15;
    this.tiempoAsignacionSeg = 180;
  }

  horarioAMinutos(hora) {
    const partes = String(hora).split(":").map(Number);
    return partes[0] * 60 + partes[1];
  }

  minutosActuales() {
    const ahora = new Date();
    return ahora.getHours() * 60 + ahora.getMinutes();
  }

  enHorario() {
    const ahora = this.minutosActuales();
    return ahora >= this.horarioAMinutos(this.horaInicio) &&
      ahora < this.horarioAMinutos(this.horaCierre);
  }

  rangoHorario() {
    return this.horaInicio + " – " + this.horaCierre;
  }

  /* La estación puede quedarse sin combustible: 0 L es un estado válido
     (y el cliente debe recibir el aviso de que no hay litros disponibles). */
  hayCombustible() {
    return Number(this.combustible) > 0;
  }

  /* Reparte los 20 turnos del día entre la hora de inicio y la de cierre.
     Con 07:00–15:00 (480 min) cada turno cae cada 24 minutos: el turno 1
     a las 07:00 y el 20 a las 14:36. */
  minutoRecogida(turno) {
    const inicio = this.horarioAMinutos(this.horaInicio);
    const cierre = this.horarioAMinutos(this.horaCierre);
    const duracion = Math.max(1, cierre - inicio);
    const n = Math.min(20, Math.max(1, Math.floor(Number(turno)) || 1));
    return inicio + Math.floor(((n - 1) * duracion) / 20);
  }

  horaRecogidaPara(turno) {
    const minuto = this.minutoRecogida(turno) % (24 * 60);
    return String(Math.floor(minuto / 60)).padStart(2, "0") + ":" +
      String(minuto % 60).padStart(2, "0");
  }

  cantidadPara(vehiculo) {
    return vehiculo.obtenerCombustible(this);
  }

  validar() {
    const errores = [];
    errores.push(Validador.validarNumero(this.combustible, "La cantidad de combustible",
      { min: 0, max: 1000000, decimales: 2 }));
    errores.push(Validador.validarNumero(this.cantidadMoto, "El litraje de moto",
      { positivo: true, min: 0.5, max: 1000, decimales: 2 }));
    errores.push(Validador.validarNumero(this.cantidadAutomovil, "El litraje de automóvil",
      { positivo: true, min: 0.5, max: 1000, decimales: 2 }));
    errores.push(Validador.validarNumero(this.cantidadCamion, "El litraje de camión",
      { positivo: true, min: 0.5, max: 1000, decimales: 2 }));
    errores.push(Validador.validarNumero(this.tiempoAsignacionSeg, "El tiempo de asignación",
      { entero: true, min: 10, max: 3600 }));
    errores.push(Validador.validarHora(this.horaInicio, "La hora de inicio"));
    errores.push(Validador.validarHora(this.horaCierre, "La hora de cierre"));

    const limpios = errores.filter(Boolean);
    if (limpios.length === 0 &&
        this.horarioAMinutos(this.horaInicio) >= this.horarioAMinutos(this.horaCierre)) {
      limpios.push("La hora de inicio debe ser anterior a la hora de cierre.");
    }
    return limpios;
  }

  /* Convierte a número los campos numéricos y deja las horas como texto
     "HH:MM". Se llama solo después de que validar() no devolvió errores. */
  normalizar() {
    ["combustible", "cantidadMoto", "cantidadAutomovil",
     "cantidadCamion", "tiempoAsignacionSeg"].forEach((clave) => {
      this[clave] = Number(this[clave]);
    });
    this.horaInicio = String(this.horaInicio === null || this.horaInicio === undefined
      ? "" : this.horaInicio).trim();
    this.horaCierre = String(this.horaCierre === null || this.horaCierre === undefined
      ? "" : this.horaCierre).trim();
    this.fecha = String(this.fecha === null || this.fecha === undefined
      ? "" : this.fecha).trim();
    return this;
  }
}

class Ticket {
  constructor(estacion, vehiculo, id) {
    this.estacion = estacion;
    this.id = id;
    this.vehiculo = vehiculo;
    this.fecha = new Date();
    this.turno = estacion.turnoDisponible();
    this.codigo = estacion.codigoDisponible();
    this.estatus = "pendiente";
    this.combustible = null;      // litros solicitados (y despachados al aceptar)
    this.horaRecogida = "";       // "HH:MM" fija, calculada al solicitar
    this.solicitante = "";        // "C-<cédula>" o "P-<token>" del cliente
    this.motivo = "";
  }

  /* El despacho lo confirma el personal (administrador o empleado).
     Devuelve { ok: true } o { error: "..." } sin cancelar la solicitud:
     si falta combustible, el ticket queda pendiente para reintentarlo. */
  aceptar(estacion) {
    if (this.estatus === "aceptado") {
      return { error: "Esta solicitud ya fue despachada." };
    }
    if (this.estatus !== "pendiente") {
      return { error: "Esta solicitud ya está cancelada." };
    }
    const litros = Number(this.combustible);
    const maximo = Number(estacion.config.cantidadPara(this.vehiculo));
    if (!Number.isFinite(litros) || litros <= 0) {
      return { error: "La solicitud no tiene una cantidad de litros válida." };
    }
    if (Number.isFinite(maximo) && litros > maximo) {
      return { error: "La solicitud excede el límite de " + maximo + " L para " +
        this.vehiculo.nombreTipo().toLowerCase() + "." };
    }
    if (!estacion.config.hayCombustible()) {
      return { error: "No hay litros disponibles en la estación en este momento." };
    }
    if (Number(estacion.config.combustible) < litros) {
      return { error: "No hay litros disponibles suficientes para despachar esta solicitud." };
    }
    estacion.config.combustible = Math.round(
      (Number(estacion.config.combustible) - litros) * 100) / 100;
    this.estatus = "aceptado";
    this.motivo = "";
    return { ok: true };
  }

  cancelar(motivo) {
    if (this.estatus === "cancelado") return;
    this.estatus = "cancelado";
    this.motivo = Validador.normalizarMotivo(motivo) || "Cancelado por el operador.";
  }

  esFinal() { return this.estatus !== "pendiente"; }

  etiquetaSolicitante() {
    const id = String(this.solicitante || "");
    if (id.indexOf("C-") === 0) return "Cliente registrado " + id.slice(2);
    if (id.indexOf("P-") === 0) return "Cliente público";
    return "Sin identificar";
  }
}

class EstacionServicio {
  constructor() {
    this.config = new ConfiguracionDistribucion();
    this.usuarios = [];
    this.tickets = [];
    this.ultimoId = 0;
  }

  /* Devuelve "" si el usuario no choca con otro, o el mensaje del campo
     duplicado. `cedulaExcluir` permite editar un usuario sin que choque
     consigo mismo. */
  buscarDuplicado(usuario, cedulaExcluir) {
    const cedula = Validador.normalizarCedula(usuario.cedula);
    const correo = String(usuario.correo).trim().toLowerCase();
    const telefono = digitos(usuario.telefono);
    const excluir = cedulaExcluir === undefined ? null : Validador.normalizarCedula(cedulaExcluir);
    const otro = this.usuarios.find(u =>
      u.cedula !== excluir &&
      (u.cedula === cedula ||
       u.correo.toLowerCase() === correo ||
       (telefono !== "" && digitos(u.telefono) === telefono)));
    if (!otro) return "";
    if (otro.cedula === cedula) return "Ya existe un usuario con esa cédula.";
    if (otro.correo.toLowerCase() === correo) return "Ya existe un usuario con ese correo.";
    return "Ya existe un usuario con ese teléfono.";
  }

  agregarUsuario(usuario) {
    const error = this.buscarDuplicado(usuario);
    if (error) return error;
    this.usuarios.push(usuario);
    return "";
  }

  actualizarUsuario(cedulaOriginal, usuario) {
    const idx = this.usuarios.findIndex(u => u.cedula ===
      Validador.normalizarCedula(cedulaOriginal));
    if (idx === -1) return "Usuario no encontrado.";
    const error = this.buscarDuplicado(usuario, cedulaOriginal);
    if (error) return error;
    this.usuarios[idx] = usuario;
    return "";
  }

  eliminarUsuario(cedula) {
    const clave = Validador.normalizarCedula(cedula);
    this.usuarios = this.usuarios.filter(u => u.cedula !== clave);
  }

  buscarUsuarioPorIdentificador(texto) {
    const t = String(texto).trim().toLowerCase();
    return this.usuarios.find(u => {
      if (!u.verificado) return false;
      if (!(u instanceof Administrador) &&
          !(u instanceof Empleado) &&
          !(u instanceof Cliente)) return false;
      return u.correo.toLowerCase() === t || digitos(u.telefono) === digitos(t);
    });
  }

  fechaActual() { return aISO(new Date()); }

  turnosUsados() {
    const hoy = this.fechaActual();
    const usados = new Set();
    this.tickets.forEach(t => {
      if (aISO(t.fecha) === hoy && t.estatus !== "cancelado") usados.add(t.turno);
    });
    return usados;
  }

  turnosRestantes() {
    return 20 - this.turnosUsados().size;
  }

  turnoDisponible() {
    const usado = this.turnosUsados();
    const libres = [];
    for (let n = 1; n <= 20; n++) if (!usado.has(n)) libres.push(n);
    if (libres.length === 0) return null;
    return libres[Math.floor(Math.random() * libres.length)];
  }

  codigoDisponible() {
    const usado = new Set(this.tickets.map(t => t.codigo));
    const libres = [];
    for (let n = 1; n <= 999; n++) if (!usado.has(n)) libres.push(n);
    return libres[Math.floor(Math.random() * libres.length)];
  }

  crearTicket(vehiculo, solicitante, litros) {
    const erroresConfig = this.config.validar();
    if (erroresConfig.length) {
      return { error: "La configuración de la estación no es válida: " + erroresConfig[0] +
        " Corríjala en «Surtir estación»." };
    }
    if (!this.config.hayCombustible()) {
      return { error: "No hay litros disponibles en la estación en este momento." };
    }
    const maximo = Number(this.config.cantidadPara(vehiculo));
    const cantidad = Number(litros);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { error: "Indique cuántos litros desea solicitar." };
    }
    if (Number.isFinite(maximo) && cantidad > maximo) {
      return { error: "El máximo permitido para " + vehiculo.nombreTipo().toLowerCase() +
        " es " + maximo + " L." };
    }
    if (Number(this.config.combustible) < cantidad) {
      return { error: "No hay litros disponibles suficientes para esa cantidad. " +
        "Intente con una cantidad menor." };
    }
    const quien = String(solicitante || "").trim();
    if (!quien) return { error: "No se pudo identificar al solicitante." };
    if (this.solicitudPendiente(quien)) {
      return { error: "Ya tienes una solicitud de cupo pendiente. Espera la confirmación del personal." };
    }
    const cupoHoy = this.cupoDelDia(quien);
    if (cupoHoy) {
      return { error: cupoHoy.estatus === "aceptado"
        ? "Ya se te asignó un cupo hoy (turno " + String(cupoHoy.turno).padStart(2, "0") + ")."
        : "Ya tienes una solicitud de cupo hoy." };
    }
    const turno = this.turnoDisponible();
    if (turno === null) return { error: "No hay cupos disponibles en este momento." };
    this.ultimoId += 1;
    const ticket = new Ticket(this, vehiculo, this.ultimoId);
    ticket.combustible = Math.round(cantidad * 100) / 100;
    ticket.solicitante = quien;
    ticket.horaRecogida = this.config.horaRecogidaPara(ticket.turno);
    this.tickets.push(ticket);
    return { ticket: ticket };
  }

  solicitudesPendientes() {
    return this.tickets.filter(t => t.estatus === "pendiente");
  }

  solicitudPendiente(solicitante) {
    return this.tickets.find(t => t.estatus === "pendiente" &&
      t.solicitante === solicitante) || null;
  }

  /* Cupo no cancelado del solicitante para el día de hoy. */
  cupoDelDia(solicitante) {
    const hoy = this.fechaActual();
    return this.tickets.find(t => t.solicitante === solicitante &&
      aISO(t.fecha) === hoy && t.estatus !== "cancelado") || null;
  }

  cupoMasReciente(solicitante) {
    let ultimo = null;
    this.tickets.forEach(t => {
      if (t.solicitante === solicitante && t.estatus !== "cancelado" &&
          (!ultimo || t.fecha.getTime() >= ultimo.fecha.getTime())) {
        ultimo = t;
      }
    });
    return ultimo;
  }

  buscar(texto) {
    const valor = String(texto === null || texto === undefined ? "" : texto).trim();
    if (!valor) return [];
    // Un código es siempre de 3 dígitos; un número con otra longitud no es
    // una placa (las placas combinan letras y números).
    if (/^\d+$/.test(valor)) {
      return valor.length === 3
        ? this.tickets.filter(t => t.codigo === Number(valor))
        : [];
    }
    const pl = valor.toUpperCase().replace(/[\s-]/g, "");
    return this.tickets.filter(t => t.vehiculo.placa.includes(pl));
  }

  totalCombustibleAsignado() {
    return this.tickets
      .filter(t => t.estatus === "aceptado")
      .reduce((suma, t) => suma + t.combustible, 0);
  }

  reportePorFiltro(tipo, marca, modelo) {
    const lista = this.tickets.filter(t => t.estatus === "aceptado");
    const filtrados = lista.filter(t =>
      (!tipo || t.vehiculo.tipo === tipo) &&
      (!marca || t.vehiculo.marca === marca) &&
      (!modelo || t.vehiculo.modelo === modelo));
    const litros = filtrados.reduce((s, t) => s + t.combustible, 0);
    return { tickets: filtrados, litros: litros };
  }

  reportePorEstatus(estatus) {
    return this.tickets.filter(t => t.estatus === estatus);
  }

  datosParaGuardar() {
    return {
      ultimoId: this.ultimoId,
      config: {
        fecha: this.config.fecha,
        combustible: this.config.combustible,
        horaInicio: this.config.horaInicio,
        horaCierre: this.config.horaCierre,
        cantidadMoto: this.config.cantidadMoto,
        cantidadAutomovil: this.config.cantidadAutomovil,
        cantidadCamion: this.config.cantidadCamion,
        tiempoAsignacionSeg: this.config.tiempoAsignacionSeg
      },
      usuarios: this.usuarios.map(u => ({
        clase: u.constructor.name,
        cedula: u.cedula, nombre: u.nombre, apellido: u.apellido,
        correo: u.correo, telefono: u.telefono, verificado: u.verificado
      })),
      tickets: this.tickets.map(t => ({
        id: t.id, turno: t.turno, codigo: t.codigo, estatus: t.estatus,
        combustible: t.combustible, motivo: t.motivo,
        horaRecogida: t.horaRecogida, solicitante: t.solicitante,
        fecha: t.fecha.toISOString(),
        vehiculo: { tipo: t.vehiculo.tipo, marca: t.vehiculo.marca,
                    modelo: t.vehiculo.modelo, placa: t.vehiculo.placa,
                    color: t.vehiculo.color }
      }))
    };
  }

  static desdeDatos(d) {
    const es = new EstacionServicio();
    if (d.config) {
      const base = new ConfiguracionDistribucion();
      const porDefecto = new ConfiguracionDistribucion();
      Object.keys(base).forEach((clave) => {
        const valor = d.config[clave];
        if (valor !== undefined && valor !== null && valor !== "") base[clave] = valor;
      });
      base.normalizar();
      // Datos viejos o corruptos: un número no finito vuelve al valor por defecto.
      ["combustible", "cantidadMoto", "cantidadAutomovil",
       "cantidadCamion", "tiempoAsignacionSeg"].forEach((clave) => {
        if (!Number.isFinite(base[clave])) base[clave] = porDefecto[clave];
      });
      if (Validador.validarHora(base.horaInicio, "La hora de inicio")) {
        base.horaInicio = porDefecto.horaInicio;
      }
      if (Validador.validarHora(base.horaCierre, "La hora de cierre")) {
        base.horaCierre = porDefecto.horaCierre;
      }
      if (!Number.isInteger(base.tiempoAsignacionSeg)) {
        base.tiempoAsignacionSeg = porDefecto.tiempoAsignacionSeg;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(base.fecha)) base.fecha = porDefecto.fecha;
      es.config = base;
    }
    if (typeof d.ultimoId === "number" && Number.isFinite(d.ultimoId) && d.ultimoId >= 0) {
      es.ultimoId = Math.floor(d.ultimoId);
    }
    (d.usuarios || []).forEach(u => {
      const nuevo = u.clase === "Administrador"
        ? new Administrador(u.cedula, u.nombre, u.apellido, u.correo, u.telefono)
        : u.clase === "Cliente"
          ? new Cliente(u.cedula, u.nombre, u.apellido, u.correo, u.telefono)
          : new Empleado(u.cedula, u.nombre, u.apellido, u.correo, u.telefono);
      nuevo.verificado = !!u.verificado;
      es.usuarios.push(nuevo);
    });
    (d.tickets || []).forEach(t => {
      const v = t.vehiculo || {};
      const tipo = NOMBRES_TIPO[v.tipo] ? v.tipo : "automovil";
      const vehiculo = FabricaVehiculos.crear(
        tipo, v.marca, v.modelo, v.placa, v.color);
      const ticket = new Ticket(es, vehiculo, t.id);
      const fecha = new Date(t.fecha);
      ticket.fecha = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
      ticket.turno = Number(t.turno);
      ticket.codigo = Number(t.codigo);
      ticket.estatus = ["pendiente", "aceptado", "cancelado"].indexOf(t.estatus) !== -1
        ? t.estatus : "cancelado";
      ticket.combustible = t.combustible === null || t.combustible === undefined
        ? null : Number(t.combustible);
      ticket.motivo = Validador.normalizarMotivo(t.motivo);
      ticket.solicitante = String(t.solicitante === null || t.solicitante === undefined
        ? "" : t.solicitante).trim().slice(0, 40);
      ticket.horaRecogida = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t.horaRecogida || ""))
        ? String(t.horaRecogida)
        : es.config.horaRecogidaPara(ticket.turno);
      es.tickets.push(ticket);
    });
    return es;
  }
}

/* Persistencia del estado.
 *
 * Modo principal: API PHP sobre MySQL/MariaDB (api/estado.php).
 * Respaldo: localStorage, para que la aplicación siga siendo usable
 * abierta como archivo local (file://) o si el servidor está caído.
 *
 * `cargar()` es asíncrona porque consulta al servidor.
 * `guardar()` no bloquea: la interfaz no necesita esperar la respuesta.
 */
class Almacenamiento {
  constructor(clave, almacen, apiUrl) {
    this.clave = clave;
    this.almacen = almacen || (typeof localStorage !== "undefined" ? localStorage : null);
    this.apiUrl = apiUrl || "api/estado.php";
    this.modoRemoto = false;
    this.ultimoError = null;
  }

  /* ---------------- API (MySQL / MariaDB) ---------------- */

  async _peticion(metodo, cuerpo) {
    if (typeof fetch !== "function") {
      return { ok: false, error: "fetch no disponible" };
    }
    const opciones = { method: metodo, headers: { "Accept": "application/json" } };
    if (cuerpo !== undefined) {
      opciones.headers["Content-Type"] = "application/json";
      opciones.body = JSON.stringify(cuerpo);
    }
    try {
      const respuesta = await fetch(this.apiUrl, opciones);
      if (!respuesta.ok) {
        return { ok: false, error: "HTTP " + respuesta.status };
      }
      return { ok: true, respuesta: respuesta };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }

  /* ---------------- localStorage ---------------- */

  _cargarLocal() {
    if (!this.almacen) return null;
    try {
      const texto = this.almacen.getItem(this.clave);
      if (!texto) return null;
      return EstacionServicio.desdeDatos(JSON.parse(texto));
    } catch (e) {
      return null;
    }
  }

  _guardarLocal(datos) {
    if (!this.almacen) return;
    try {
      this.almacen.setItem(this.clave, JSON.stringify(datos));
    } catch (e) {
      /* cuota llena o almacenamiento bloqueado: se ignora */
    }
  }

  /* ---------------- Interfaz usada por el núcleo ---------------- */

  async cargar() {
    if (typeof fetch === "function") {
      try {
        const respuesta = await fetch(this.apiUrl, {
          method: "GET",
          headers: { "Accept": "application/json" }
        });
        if (respuesta.ok) {
          this.modoRemoto = true;
          this.ultimoError = null;
          const datos = await respuesta.json();
          return datos ? EstacionServicio.desdeDatos(datos) : null;
        }
        this.ultimoError = "HTTP " + respuesta.status;
      } catch (e) {
        this.ultimoError = String(e && e.message ? e.message : e);
      }
    }
    this.modoRemoto = false;
    return this._cargarLocal();
  }

  guardar(estacion) {
    if (!estacion) return;
    const datos = estacion.datosParaGuardar();
    this._guardarLocal(datos);
    if (!this.modoRemoto) return;
    this._peticion("POST", datos).then((r) => {
      if (!r.ok) {
        console.error("[ORICHUNA] No se pudo guardar en MySQL:", r.error);
      }
    });
  }

  async limpiar() {
    if (this.modoRemoto) {
      const r = await this._peticion("DELETE");
      if (!r.ok) {
        console.error("[ORICHUNA] No se pudo limpiar MySQL:", r.error);
      }
    }
    if (this.almacen) this.almacen.removeItem(this.clave);
  }
}

function digitos(texto) {
  return String(texto).replace(/[^\d]/g, "");
}