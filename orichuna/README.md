# ORICHUNA.CA — Sistema de Asignación de Cupos y Turnos Vehiculares

Aplicación web (**HTML + CSS + JavaScript** puro) que automatiza la
distribución de combustible subsidiado: registro de usuarios, configuración diaria
de la estación, **solicitud de cupo por parte del cliente** con elección de litros y
hora de recogida, **despacho confirmado por el administrador/empleado**, tickets
digitales con turno y código de verificación únicos, reportes y búsqueda.

Los datos se guardan en una base de datos **MySQL / MariaDB** a través de una
pequeña API en **PHP** (incluida en `api/`). Si esa API no está disponible, la app
sigue funcionando y guarda en el navegador (`localStorage`) como respaldo.

## Documentación de estudio

- `Documentacion_ORICHUNA.pdf` — documento completo (42 páginas): arquitectura,
  modelo de datos, SQL, API, POO, validaciones, flujos, preguntas de repaso y ejercicios.
- `Documentacion_ORICHUNA.md` — la misma documentación en Markdown, para editar.
- `README.md` — esta guía rápida.

## Cómo abrirla

### Opción A — Con base de datos real (recomendado)

Requiere **XAMPP** (Apache + MySQL/MariaDB + PHP).

1. Copia la carpeta `orichuna` dentro de `C:\xampp\htdocs\`.
2. Abre el panel de XAMPP y arranca **Apache** y **MySQL**.
3. Crea la base de datos una sola vez abriendo en el navegador:
   <http://localhost/orichuna/api/instalar.php>
   (debe responder `OK: base de datos 'orichuna' lista`).
4. Entra a la aplicación en <http://localhost/orichuna/>.

Los datos quedan en la base `orichuna` y se conservan aunque cambies de navegador
o borres la caché. Si tus credenciales de MySQL no son las de XAMPP por defecto
(usuario `root` sin contraseña), ajústalas en `api/config.php`.

### Opción B — Sin servidor (solo navegador)

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
  y cierre, y **máximo de litros por tipo de vehículo**.
- **Mi cupo de gasolina (Cliente):** el cliente registra su vehículo, elige cuántos
  litros desea (hasta el máximo de su tipo) y envía la solicitud. Ve su turno,
  placa, litros solicitados, estatus y **hora de recogida**, pero nunca el stock ni
  cuántos cupos quedan. Si no hay litros, aparece el aviso correspondiente.
- **Solicitudes de cupo (Administrador/Empleado):** lista de solicitudes pendientes
  con hora de recogida y litros. El personal pulsa **Despachar** para confirmar
  (descuenta el combustible) o **Cancelar** con un motivo.
- **Ticket digital:** estación y fecha, turno aleatorio único (1-20), datos del
  vehículo, hora de recogida, estatus (Pendiente / Aceptado = litros despachados /
  Cancelado = motivo) y **código de verificación único de 3 dígitos**.
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

- Un solo **cupo por cliente y por día** (turno 1-20): al completarse 20 se rechazan
  nuevas solicitudes.
- El código de verificación (1-999) **nunca se repite** entre todos los tickets.
- El combustible se descuenta **solo cuando el personal confirma el despacho**; si
  no alcanza, la solicitud sigue pendiente y se avisa al personal.
- Si el stock está en 0, el cliente ve **"No hay litros disponibles"** y no puede
  enviar la solicitud.
- El cliente elige los litros dentro del **máximo de su tipo de vehículo** y nunca
  ve el inventario ni cuántos turnos quedan.
- Fuera del horario configurado no se permiten nuevas solicitudes.
- **Validación antes de guardar:** si un campo es inválido, la operación completa se
  rechaza y no deja valores a medias. El combustible del día va de 0 a 1 000 000 L;
  los máximos por vehículo, de 0,5 a 1000 L (máximo 2 decimales); las horas son
  `HH:MM` con inicio anterior al cierre.
- Cédula normalizada (`V-12345678`), placa de 6-8 caracteres que combine letras y
  números, correo con formato válido y teléfono de 7 a 15 dígitos. Los textos se
  limitan al tamaño de su columna.
- La API repite las reglas: responde **HTTP 422** ante datos inválidos (incluidos
  negativos) y **HTTP 409** ante cédula, correo, teléfono o código duplicado.

## Estructura (POO)

```
js/modelos.js          → Clases y reglas (no toca la pantalla)
js/nucleo.js           → Núcleo de la interfaz: estado, utilidades, login,
                         navegación, modal de verificación y EmailJS.
js/vistas/*.js         → Un módulo "vista" por pantalla: inicio, mi cupo
                         (cliente), solicitudes de cupo (personal), tickets,
                         surtir estación, usuarios, reportes y búsqueda.
                         Cada una registra su pintor en ORC.pintores.
index.html             → Estructura
css/estilos.css        → Diseño
api/                   → API PHP + esquema MySQL/MariaDB (persistencia)
Documentacion_ORICHUNA.md   → Documentación técnica y guía de estudio (fuente)
Documentacion_ORICHUNA.pdf  → La misma documentación lista para imprimir
```

### Cómo se conectan los módulos

- `js/modelos.js` define las clases globales (`EstacionServicio`, `Usuario`,
  `Vehiculo`, etc.) y `js/nucleo.js` define el objeto global **`ORC`**, que
  expone el estado y los servicios compartidos (`ORC.estado`, `ORC.esc`,
  `ORC.abrirModalCodigo`, `ORC.enviarEmailReal`, `ORC.htmlTicket`...).
- Cada vista en `js/vistas/*.js` es una función anónima controlada (IIFE) que
  usa la API de `ORC` y se registra con: `ORC.pintores["su-clave"] = pintor`.
- La navegación (`navegar()`) muestra la vista y llama a `ORC.pintores[vista]()`.
- `ORC.recargarEstado()` vuelve a leer el servidor para que el cliente o el personal
  vean los cambios hechos en otra sesión (botones "Actualizar").

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
- **ConfiguracionDistribucion** — datos del día (litros, horario, máximos) y
  cálculo de la hora de recogida de cada turno.
- **Ticket** — turno, código, vehículo, hora de recogida, solicitante, estatus y
  motivo; `aceptar()` valida y descuenta combustible (lo confirma el personal) y
  `cancelar(motivo)` cierra la solicitud.
- **EstacionServicio** — la estación completa: usuarios y tickets; se encarga de la
  unicidad de turnos y códigos, reportes, búsqueda y del acceso (login) por correo
  o teléfono de cuentas verificadas.
- **Almacenamiento** — guarda y recupera todo el estado. Usa la API PHP
  (`api/estado.php`, MySQL/MariaDB) y, si no está disponible, cae en `localStorage`.

### Base de datos

```
api/config.php         → Host, puerto, nombre, usuario y clave de MySQL
api/db.php             → Conexión PDO compartida
api/estado.php         → API del estado: GET (leer), POST (guardar), DELETE (borrar)
api/instalar.php       → Crea la base y las tablas ejecutando schema.sql
api/schema.sql         → Tablas: usuario, vehiculo, ticket, configuracion, estado_app
```

El estado completo se envía y se recibe como JSON con la misma forma que producen
`EstacionServicio.datosParaGuardar()` y `EstacionServicio.desdeDatos()`; la API lo
descompone en las cinco tablas relacionales. La escritura se hace dentro de una
transacción, así que una carga nunca deja la base a medias.

La ficha "Modelo de clases" con este diagrama también está dentro de la
aplicación, en el módulo **Inicio**.