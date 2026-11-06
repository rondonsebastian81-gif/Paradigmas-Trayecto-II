-- ============================================================
--  ORICHUNA.CA · Esquema de base de datos (MySQL / MariaDB)
--  Compatible con MySQL 5.7+/8.x y MariaDB 10.3+
--  Idempotente: se puede ejecutar varias veces sin perder datos.
-- ============================================================

CREATE DATABASE IF NOT EXISTS orichuna
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE orichuna;

-- Cuentas del sistema (Administrador / Empleado / Cliente).
-- La cédula, el correo y el teléfono son únicos: el propio sistema
-- impide duplicados, aquí se refuerza a nivel de base de datos.
CREATE TABLE IF NOT EXISTS usuario (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  cedula            VARCHAR(20)  NOT NULL,
  nombre            VARCHAR(80)  NOT NULL,
  apellido          VARCHAR(80)  NOT NULL,
  correo            VARCHAR(150) NOT NULL,
  telefono          VARCHAR(30)  NOT NULL,
  telefono_digitos  VARCHAR(20)  NOT NULL,
  clase             ENUM('Administrador','Empleado','Cliente') NOT NULL,
  verificado        TINYINT(1)   NOT NULL DEFAULT 0,
  UNIQUE KEY uq_usuario_cedula   (cedula),
  UNIQUE KEY uq_usuario_correo   (correo),
  UNIQUE KEY uq_usuario_telefono (telefono_digitos)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vehículo asociado a cada ticket (relación 1:1).
CREATE TABLE IF NOT EXISTS vehiculo (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  tipo    ENUM('moto','automovil','camion') NOT NULL,
  marca   VARCHAR(80) NOT NULL,
  modelo  VARCHAR(80) NOT NULL,
  placa   VARCHAR(10) NOT NULL,
  color   VARCHAR(60) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ticket digital. El código de verificación es único en todo el sistema.
CREATE TABLE IF NOT EXISTS ticket (
  id          INT PRIMARY KEY,
  turno       INT NOT NULL,
  codigo      INT NOT NULL,
  estatus     ENUM('pendiente','aceptado','cancelado') NOT NULL,
  combustible DECIMAL(10,2) NULL,
  motivo      VARCHAR(255) NOT NULL DEFAULT '',
  hora_recogida VARCHAR(5) NOT NULL DEFAULT '',
  solicitante   VARCHAR(40) NOT NULL DEFAULT '',
  fecha       DATETIME NOT NULL,
  vehiculo_id INT NOT NULL,
  UNIQUE KEY uq_ticket_codigo (codigo),
  KEY idx_ticket_fecha (fecha),
  KEY idx_ticket_solicitante (solicitante),
  CONSTRAINT fk_ticket_vehiculo
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculo(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configuración del día (una única fila, id = 1).
CREATE TABLE IF NOT EXISTS configuracion (
  id                    TINYINT PRIMARY KEY DEFAULT 1,
  fecha                 DATE NOT NULL,
  combustible           DECIMAL(10,2) NOT NULL,
  hora_inicio           TIME NOT NULL,
  hora_cierre           TIME NOT NULL,
  cantidad_moto         DECIMAL(10,2) NOT NULL,
  cantidad_automovil    DECIMAL(10,2) NOT NULL,
  cantidad_camion       DECIMAL(10,2) NOT NULL,
  tiempo_asignacion_seg INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contador de tickets (una única fila, id = 1).
CREATE TABLE IF NOT EXISTS estado_app (
  id        TINYINT PRIMARY KEY DEFAULT 1,
  ultimo_id INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
