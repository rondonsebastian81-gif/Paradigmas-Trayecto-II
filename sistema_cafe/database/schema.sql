-- ============================================================================
--  Café Control - Sistema de compra y venta de café
--  Esquema de base de datos (MySQL / MariaDB)
--  Se puede importar desde phpMyAdmin o ejecutar instalar.php
-- ============================================================================

CREATE DATABASE IF NOT EXISTS cafe_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cafe_db;

-- ---------------------------------------------------------------------------
--  Usuarios del sistema (sección de acceso)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  usuario       VARCHAR(60)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           ENUM('admin','vendedor') NOT NULL DEFAULT 'vendedor',
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
--  Configuración general (tasa de cambio Bs/$)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(60) PRIMARY KEY,
  valor VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

INSERT INTO configuracion (clave, valor) VALUES ('tasa_cambio', '36.50')
  ON DUPLICATE KEY UPDATE clave = clave;

-- ---------------------------------------------------------------------------
--  Tipos de café (tres versiones)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipos_cafe (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO tipos_cafe (nombre) VALUES ('Suave'), ('Normal'), ('Fuerte')
  ON DUPLICATE KEY UPDATE nombre = nombre;

-- ---------------------------------------------------------------------------
--  Proveedores (se compra de contado, precio en dólares)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  nombre_negocio      VARCHAR(150) NOT NULL,
  rif                 VARCHAR(30)  NOT NULL UNIQUE,
  contacto_nombre     VARCHAR(120) NOT NULL,
  contacto_cedula     VARCHAR(30)  NOT NULL,
  contacto_telefono   VARCHAR(40)  NOT NULL,
  contacto_email      VARCHAR(120) NOT NULL,
  activo              TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
--  Clientes / acreedores (se vende en bolívares con financiamiento)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  nombre_negocio      VARCHAR(150) NOT NULL,
  rif                 VARCHAR(30)  NOT NULL UNIQUE,
  contacto_nombre     VARCHAR(120) NOT NULL,
  contacto_cedula     VARCHAR(30)  NOT NULL,
  contacto_telefono   VARCHAR(40)  NOT NULL,
  contacto_email      VARCHAR(120) NOT NULL,
  activo              TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
--  Compras (cabecera) - al contado en dólares
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compras (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  folio         VARCHAR(30)  NOT NULL UNIQUE,
  proveedor_id  INT          NOT NULL,
  fecha         DATE         NOT NULL,
  total_usd     DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  observacion   VARCHAR(255) NULL,
  usuario_id    INT          NOT NULL,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_compra_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  CONSTRAINT fk_compra_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compra_detalle (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  compra_id     INT NOT NULL,
  tipo_cafe_id  INT NOT NULL,
  cantidad_kg   DECIMAL(12,2) NOT NULL,
  precio_usd_kg DECIMAL(12,2) NOT NULL,
  monto_usd     DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_cdet_compra FOREIGN KEY (compra_id)    REFERENCES compras(id) ON DELETE CASCADE,
  CONSTRAINT fk_cdet_tipo   FOREIGN KEY (tipo_cafe_id) REFERENCES tipos_cafe(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
--  Ventas (cabecera) - en bolívares, con financiamiento (crédito)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  folio            VARCHAR(30)  NOT NULL UNIQUE,
  cliente_id       INT          NOT NULL,
  fecha            DATE         NOT NULL,
  fecha_vencimiento DATE        NOT NULL,
  tasa_cambio      DECIMAL(14,2) NOT NULL,
  total_bs         DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  estado_pago      ENUM('pendiente','pagada','anulada') NOT NULL DEFAULT 'pendiente',
  fecha_pago       DATE         NULL,
  observacion      VARCHAR(255) NULL,
  usuario_id       INT          NOT NULL,
  creado_en        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_venta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_venta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS venta_detalle (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  venta_id      INT NOT NULL,
  tipo_cafe_id  INT NOT NULL,
  cantidad_kg   DECIMAL(12,2) NOT NULL,
  precio_bs_kg  DECIMAL(14,2) NOT NULL,
  costo_usd_kg  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  monto_bs      DECIMAL(16,2) NOT NULL,
  CONSTRAINT fk_vdet_venta FOREIGN KEY (venta_id)    REFERENCES ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_vdet_tipo  FOREIGN KEY (tipo_cafe_id) REFERENCES tipos_cafe(id)
) ENGINE=InnoDB;

-- ============================================================================
--  NOTA: el usuario administrador se crea con instalar.php
--  Credenciales por defecto:  usuario: admin   clave: admin123
-- ============================================================================
