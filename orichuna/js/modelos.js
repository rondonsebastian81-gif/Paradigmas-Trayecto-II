"use strict";

const NOMBRES_TIPO = { moto: "Moto", automovil: "Automóvil", camion: "Camión" };

function aISO(fecha) {
  return fecha.getFullYear() + "-" +
    String(fecha.getMonth() + 1).padStart(2, "0") + "-" +
    String(fecha.getDate()).padStart(2, "0");
}

class Validador {
  static validarCedula(texto) {
    if (!texto) return "La cédula es obligatoria.";
    if (!/^[VEJ]{0,2}-?\s?\d{6,9}$/i.test(String(texto).trim()))
      return "Cédula inválida (ej.: V-12345678).";
    return "";
  }
  static validarLetras(texto, campo) {
    if (!texto) return campo + " es obligatorio.";
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.\s-]+$/.test(String(texto).trim()))
      return campo + " solo debe contener letras.";
    return "";
  }
  static validarAlfanumerico(texto, campo) {
    if (!texto) return campo + " es obligatorio.";
    if (!/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ'.\s+-]+$/.test(String(texto).trim()))
      return campo + " solo debe contener letras y números.";
    return "";
  }
  static validarPlaca(texto) {
    if (!texto) return "La placa es obligatoria.";
    if (!/^[A-Z0-9]{6,8}$/.test(String(texto).trim().toUpperCase()))
      return "La placa debe tener entre 6 y 8 caracteres alfanuméricos.";
    return "";
  }
  static validarEmail(texto) {
    if (!texto) return "El correo es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(texto).trim()))
      return "Correo electrónico inválido.";
    return "";
  }
  static validarTelefono(texto) {
    if (!texto) return "El teléfono es obligatorio.";
    if (!/^\+?[0-9 ()\-]{7,15}$/.test(String(texto).trim()))
      return "Teléfono inválido (ej.: 0412-1234567).";
    return "";
  }
  static validarPositivo(valor, campo) {
    const n = Number(valor);
    if (!isFinite(n) || n <= 0) return campo + " debe ser un número mayor que 0.";
    return "";
  }
}

class Usuario {
  constructor(cedula, nombre, apellido, correo, telefono) {
    this.cedula = String(cedula).trim();
    this.nombre = String(nombre).trim();
    this.apellido = String(apellido).trim();
    this.correo = String(correo).trim();
    this.telefono = String(telefono).trim();
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
    this.marca = String(marca).trim();
    this.modelo = String(modelo).trim();
    this.placa = String(placa).trim().toUpperCase();
    this.color = String(color).trim();
  }

  nombreTipo() { return NOMBRES_TIPO[this.tipo] || this.tipo; }

  linea() {
    return this.nombreTipo() + " · " + this.marca + " " + this.modelo +
      " · Placa " + this.placa + " · " + this.color;
  }

  validar() {
    const errores = [];
    if (!NOMBRES_TIPO[this.tipo]) errores.push("Seleccione el tipo de vehículo.");
    errores.push(Validador.validarLetras(this.marca, "La marca"));
    errores.push(Validador.validarAlfanumerico(this.modelo, "El modelo"));
    errores.push(Validador.validarPlaca(this.placa));
    errores.push(Validador.validarLetras(this.color, "El color"));
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

  cantidadPara(vehiculo) {
    return vehiculo.obtenerCombustible(this);
  }

  validar() {
    const errores = [];
    errores.push(Validador.validarPositivo(this.combustible, "La cantidad de combustible"));
    errores.push(Validador.validarPositivo(this.cantidadMoto, "El litraje de moto"));
    errores.push(Validador.validarPositivo(this.cantidadAutomovil, "El litraje de automóvil"));
    errores.push(Validador.validarPositivo(this.cantidadCamion, "El litraje de camión"));
    errores.push(Validador.validarPositivo(this.tiempoAsignacionSeg, "El tiempo de asignación"));
    if (!/^\d{2}:\d{2}$/.test(this.horaInicio) || !/^\d{2}:\d{2}$/.test(this.horaCierre)) {
      errores.push("Indique hora de inicio y cierre válidas (HH:MM).");
    } else if (this.horarioAMinutos(this.horaInicio) >= this.horarioAMinutos(this.horaCierre)) {
      errores.push("La hora de inicio debe ser anterior a la hora de cierre.");
    }
    return errores.filter(Boolean);
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
    this.combustible = null;
    this.motivo = "";
  }

  aceptar(estacion) {
    if (this.estatus === "aceptado") return;
    const litros = estacion.config.cantidadPara(this.vehiculo);
    if (estacion.config.combustible < litros) {
      this.estatus = "cancelado";
      this.motivo = "Combustible insuficiente (" + estacion.config.combustible + " L disponibles).";
      return false;
    }
    estacion.config.combustible -= litros;
    this.combustible = litros;
    this.estatus = "aceptado";
    this.motivo = "";
    return true;
  }

  cancelar(motivo) {
    if (this.estatus === "cancelado") return;
    this.estatus = "cancelado";
    this.motivo = motivo;
  }

  esFinal() { return this.estatus !== "pendiente"; }
}

class EstacionServicio {
  constructor() {
    this.config = new ConfiguracionDistribucion();
    this.usuarios = [];
    this.tickets = [];
    this.ultimoId = 0;
  }

  agregarUsuario(usuario) {
    const duplicado = this.usuarios.some(u =>
      u.cedula === usuario.cedula ||
      u.correo.toLowerCase() === usuario.correo.toLowerCase() ||
      digitos(u.telefono) === digitos(usuario.telefono));
    if (duplicado) return "Ya existe un usuario con esa cédula, correo o teléfono.";
    this.usuarios.push(usuario);
    return "";
  }

  actualizarUsuario(cedulaOriginal, usuario) {
    const idx = this.usuarios.findIndex(u => u.cedula === cedulaOriginal);
    if (idx === -1) return "Usuario no encontrado.";
    this.usuarios[idx] = usuario;
    return "";
  }

  eliminarUsuario(cedula) {
    this.usuarios = this.usuarios.filter(u => u.cedula !== cedula);
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
    this.tickets.forEach(t => { if (aISO(t.fecha) === hoy) usados.add(t.turno); });
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

  crearTicket(vehiculo) {
    const turno = this.turnoDisponible();
    if (turno === null) return { error: "No hay turnos disponibles (20/20)." };
    this.ultimoId += 1;
    const ticket = new Ticket(this, vehiculo, this.ultimoId);
    this.tickets.push(ticket);
    return { ticket: ticket };
  }

  buscar(texto) {
    const valor = String(texto).trim();
    if (!valor) return [];
    if (/^\d{3}$/.test(valor)) {
      return this.tickets.filter(t => t.codigo === Number(valor));
    }
    const pl = valor.toUpperCase();
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
        fecha: t.fecha.toISOString(),
        vehiculo: { tipo: t.vehiculo.tipo, marca: t.vehiculo.marca,
                    modelo: t.vehiculo.modelo, placa: t.vehiculo.placa,
                    color: t.vehiculo.color }
      }))
    };
  }

  static desdeDatos(d) {
    const es = new EstacionServicio();
    if (d.config) Object.assign(es.config, d.config);
    if (typeof d.ultimoId === "number") es.ultimoId = d.ultimoId;
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
      const vehiculo = FabricaVehiculos.crear(
        t.vehiculo.tipo, t.vehiculo.marca, t.vehiculo.modelo,
        t.vehiculo.placa, t.vehiculo.color);
      const ticket = new Ticket(es, vehiculo, t.id);
      ticket.fecha = new Date(t.fecha);
      ticket.turno = t.turno;
      ticket.codigo = t.codigo;
      ticket.estatus = t.estatus;
      ticket.combustible = t.combustible;
      ticket.motivo = t.motivo;
      es.tickets.push(ticket);
    });
    return es;
  }
}

class Almacenamiento {
  constructor(clave, almacen) {
    this.clave = clave;
    this.almacen = almacen || (typeof localStorage !== "undefined" ? localStorage : null);
  }

  guardar(estacion) {
    if (!this.almacen) return;
    this.almacen.setItem(this.clave, JSON.stringify(estacion.datosParaGuardar()));
  }

  cargar() {
    if (!this.almacen) return null;
    try {
      const texto = this.almacen.getItem(this.clave);
      if (!texto) return null;
      return EstacionServicio.desdeDatos(JSON.parse(texto));
    } catch (e) {
      return null;
    }
  }

  limpiar() {
    if (!this.almacen) return;
    this.almacen.removeItem(this.clave);
  }
}

function digitos(texto) {
  return String(texto).replace(/[^\d]/g, "");
}