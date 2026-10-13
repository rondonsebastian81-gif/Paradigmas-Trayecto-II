# ORICHUNA.CA — Sistema de Asignación de Cupos y Turnos Vehiculares

Aplicación web (**HTML + CSS + JavaScript** puro, sin servidor) que automatiza la
distribución de combustible subsidiado: registro de usuarios, configuración diaria
de la estación, asignación de vehículos con **temporizador de 3 minutos**, tickets
digitales con turno y código de verificación únicos, reportes y búsqueda.

## Cómo abrirla

1. Doble clic en `index.html` (o ábrela con cualquier navegador: Chrome, Edge, etc.).
2. Los datos se guardan en el propio navegador (localStorage), no necesitan internet.

> **Primera vez / datos de demostración:** si ya usaste una versión anterior de la
> app, pulsa **"Restablecer datos de demostración"** en la pantalla de inicio para
> que queden activas las cuentas de ejemplo y el correo real del administrador.

### Cuentas de demostración (ya verificadas)

| Rol | Correo | Teléfono |
|---|---|---|
| Administrador | rondonsebastian81@gmail.com | 0412-0000000 |
| Empleado | empleado@orichuna.com | 0424-1112233 |

Para entrar: en la pestaña "Administrador / Empleado" escribe el correo o el
teléfono y pulsa "Enviar código". El código de 4 dígitos aparece en la pantalla y,
gracias a **EmailJS (ya configurado con las claves del proyecto)**, llega además
**de verdad al correo de la cuenta**.

Los clientes usan la pestaña "Cliente (público)": pueden **registrarse** (cédula,
nombre, apellido, correo y teléfono) —la cuenta se crea verificada tras recibir el
código en su correo—, **iniciar sesión** con su correo/teléfono y código, o acceder
**sin registrarse** como cliente público.

## Módulos

- **Gestor de usuarios (Administrador):** agregar, modificar y eliminar cuentas
  (Administrador / Empleado / Cliente). Al agregar, la cuenta se **verifica por
  correo y/o teléfono** con un código.
- **Surtir estación (Administrador/Empleado):** combustible del día, hora de inicio
  y cierre, litros por tipo de vehículo y tiempo límite de asignación.
- **Asignación (todos):** registro del vehículo (tipo, marca, modelo, placa, color)
  con validación total y **temporizador regresivo** visible; al agotarse el tiempo
  el cupo se cancela.
- **Ticket digital:** estación y fecha, turno aleatorio único (1-20), datos del
  vehículo, estatus (Aceptado = tipo + litros asignados / Cancelado = motivo) y
  **código de verificación único de 3 dígitos**.
- **Tickets:** tabla con todos los comprobantes generados.
- **Reportes:** por tipo de vehículo / marca / modelo con total de combustible
  asignado, y por estatus con detalle.
- **Búsqueda:** por código de verificación y por placa.

### Envío real por Email (EmailJS)

La app ya trae las claves del proyecto (Public Key, Service ID y Template ID)
embebidas, por lo que los códigos de verificación de **login, registro y creación
de cuentas** se envían de verdad al correo. La plantilla usa las variables
`to_email`, `subject` y `message`.

El **SMS es simulado** en pantalla (el código se muestra igual): enviar SMS reales
desde una página HTML estática requiere proveedores de pago (Twilio, 46elks, etc.)
y no es viable sin servidor.

## Reglas de negocio

- Un solo **turno por día** (1-20): al completarse 20 se rechazan nuevas solicitudes.
- El código de verificación (1-999) **nunca se repite** entre todos los tickets.
- El combustible se descuenta al confirmar; si no alcanza, el ticket queda Cancelado
  con motivo "Combustible insuficiente".
- Fuera del horario configurado no se permite asignar.
- Todas las validaciones: cédula, correo, teléfono, letras (marca/color),
  alfanumérico (modelo), placa de 6-8 caracteres.

## Estructura (POO)

```
js/modelos.js          → Clases y reglas (no toca la pantalla)
js/nucleo.js           → Núcleo de la interfaz: estado, utilidades, login,
                         navegación, modal de verificación y EmailJS.
js/vistas/*.js         → Un módulo "vista" por pantalla: inicio, asignación
                         (con temporizador), tickets, surtir estación,
                         usuarios, reportes y búsqueda. Cada una registra su
                         pintor en el objeto global ORC.pintores.
index.html             → Estructura
css/estilos.css        → Diseño
```

### Cómo se conectan los módulos

- `js/modelos.js` define las clases globales (`EstacionServicio`, `Usuario`,
  `Vehiculo`, etc.) y `js/nucleo.js` define el objeto global **`ORC`**, que
  expone el estado y los servicios compartidos (`ORC.estado`, `ORC.esc`,
  `ORC.abrirModalCodigo`, `ORC.enviarEmailReal`, `ORC.htmlTicket`...).
- Cada vista en `js/vistas/*.js` es una función anónima controlada (IIFE) que
  usa la API de `ORC` y se registra con: `ORC.pintores["su-clave"] = pintor`.
- La navegación (`navegar()`) muestra la vista y llama a `ORC.pintores[vista]()`.
- La asignación además registra `ORC.detenerTemporizador` para que el núcleo
  pueda detener el cronómetro al salir o reiniciar la demostración.

### Clases, herencia y polimorfismo

- **Validador** — funciones estáticas que comprueban cada dato.
- **Usuario** — base: cédula, nombres, correo, teléfono y `verificado`.
  - **Administrador extends Usuario** — puede todo.
  - **Empleado extends Usuario** — no puede gestionar usuarios.
  - **Cliente extends Usuario** — solo puede solicitar la asignación de un cupo.
  - *Polimorfismo:* `rol()` y `puede(acción)` responden distinto en cada rol.
- **Vehiculo** — base: tipo, marca, modelo, placa, color.
  - **Moto extends Vehiculo** — `obtenerCombustible()` devuelve el litraje de moto.
  - **Automovil extends Vehiculo** — devuelve el litraje de automóvil.
  - **Camion extends Vehiculo** — devuelve el litraje de camión.
  - *Polimorfismo:* el mismo método se comporta distinto según el subtipo.
- **FabricaVehiculos** — crea el subtipo correcto según el tipo elegido.
- **ConfiguracionDistribucion** — datos del día (litros, horario, tiempos).
- **Ticket** — turno, código, vehículo, estatus y motivo; `aceptar()` descuenta
  combustible y `cancelar(motivo)` cierra el cupo.
- **EstacionServicio** — la estación completa: usuarios y tickets; se encarga de la
  unicidad de turnos y códigos, reportes, búsqueda y del acceso (login) por correo
  o teléfono de cuentas verificadas.
- **Almacenamiento** — guarda y recupera todo en localStorage.

La ficha "Modelo de clases" con este diagrama también está dentro de la
aplicación, en el módulo **Inicio**.