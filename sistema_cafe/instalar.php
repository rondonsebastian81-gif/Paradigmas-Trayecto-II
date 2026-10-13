<?php
/**
 * Instalador del sistema Café Control.
 * Crea la base de datos, las tablas, los datos iniciales y el usuario administrador.
 * Ábrelo una sola vez:  http://localhost/sistema_cafe/instalar.php
 */
require_once __DIR__ . '/config/config.php';

$pasos = [];
$error = null;

function crearPdoSinBd(): PDO
{
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';charset=' . DB_CHARSET;
    return new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

try {
    // 1) Conectar al servidor y crear la base de datos
    $root = crearPdoSinBd();
    $root->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pasos[] = 'Base de datos "' . DB_NAME . '" verificada/creada.';

    // 2) Conectar a la base de datos
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // 3) Crear tablas
    $tablas = [];

    $tablas[] = "CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        usuario VARCHAR(60) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        rol ENUM('admin','vendedor') NOT NULL DEFAULT 'vendedor',
        activo TINYINT(1) NOT NULL DEFAULT 1,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB";

    $tablas[] = "CREATE TABLE IF NOT EXISTS configuracion (
        clave VARCHAR(60) PRIMARY KEY,
        valor VARCHAR(120) NOT NULL
    ) ENGINE=InnoDB";

    $tablas[] = "CREATE TABLE IF NOT EXISTS tipos_cafe (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(60) NOT NULL UNIQUE,
        activo TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB";

    $tablas[] = "CREATE TABLE IF NOT EXISTS proveedores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_negocio VARCHAR(150) NOT NULL,
        rif VARCHAR(30) NOT NULL UNIQUE,
        contacto_nombre VARCHAR(120) NOT NULL,
        contacto_cedula VARCHAR(30) NOT NULL,
        contacto_telefono VARCHAR(40) NOT NULL,
        contacto_email VARCHAR(120) NOT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB";

    $tablas[] = "CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_negocio VARCHAR(150) NOT NULL,
        rif VARCHAR(30) NOT NULL UNIQUE,
        contacto_nombre VARCHAR(120) NOT NULL,
        contacto_cedula VARCHAR(30) NOT NULL,
        contacto_telefono VARCHAR(40) NOT NULL,
        contacto_email VARCHAR(120) NOT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB";

    $tablas[] = "CREATE TABLE IF NOT EXISTS compras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        folio VARCHAR(30) NOT NULL UNIQUE,
        proveedor_id INT NOT NULL,
        fecha DATE NOT NULL,
        total_usd DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        observacion VARCHAR(255) NULL,
        usuario_id INT NOT NULL,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_compra_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
        CONSTRAINT fk_compra_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ) ENGINE=InnoDB";

    $tablas[] = "CREATE TABLE IF NOT EXISTS compra_detalle (
        id INT AUTO_INCREMENT PRIMARY KEY,
        compra_id INT NOT NULL,
        tipo_cafe_id INT NOT NULL,
        cantidad_kg DECIMAL(12,2) NOT NULL,
        precio_usd_kg DECIMAL(12,2) NOT NULL,
        monto_usd DECIMAL(14,2) NOT NULL,
        CONSTRAINT fk_cdet_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
        CONSTRAINT fk_cdet_tipo FOREIGN KEY (tipo_cafe_id) REFERENCES tipos_cafe(id)
    ) ENGINE=InnoDB";

    $tablas[] = "CREATE TABLE IF NOT EXISTS ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        folio VARCHAR(30) NOT NULL UNIQUE,
        cliente_id INT NOT NULL,
        fecha DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        tasa_cambio DECIMAL(14,2) NOT NULL,
        total_bs DECIMAL(16,2) NOT NULL DEFAULT 0.00,
        estado_pago ENUM('pendiente','pagada','anulada') NOT NULL DEFAULT 'pendiente',
        fecha_pago DATE NULL,
        observacion VARCHAR(255) NULL,
        usuario_id INT NOT NULL,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_venta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        CONSTRAINT fk_venta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ) ENGINE=InnoDB";

    $tablas[] = "CREATE TABLE IF NOT EXISTS venta_detalle (
        id INT AUTO_INCREMENT PRIMARY KEY,
        venta_id INT NOT NULL,
        tipo_cafe_id INT NOT NULL,
        cantidad_kg DECIMAL(12,2) NOT NULL,
        precio_bs_kg DECIMAL(14,2) NOT NULL,
        costo_usd_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        monto_bs DECIMAL(16,2) NOT NULL,
        CONSTRAINT fk_vdet_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
        CONSTRAINT fk_vdet_tipo FOREIGN KEY (tipo_cafe_id) REFERENCES tipos_cafe(id)
    ) ENGINE=InnoDB";

    foreach ($tablas as $sql) {
        $pdo->exec($sql);
    }
    $pasos[] = 'Tablas creadas correctamente.';

    // 4) Datos iniciales
    $pdo->exec("INSERT INTO configuracion (clave, valor) VALUES ('tasa_cambio', '" . TASA_CAMBIO_DEFAULT . "')
                ON DUPLICATE KEY UPDATE clave = clave");
    $pasos[] = 'Tasa de cambio inicial: Bs ' . number_format(TASA_CAMBIO_DEFAULT, 2) . ' / $';

    $pdo->exec("INSERT INTO tipos_cafe (nombre) VALUES ('Suave'), ('Normal'), ('Fuerte')
                ON DUPLICATE KEY UPDATE nombre = nombre");
    $pasos[] = 'Tipos de café registrados: Suave, Normal y Fuerte.';

    // 5) Usuario administrador
    $st = $pdo->prepare('SELECT COUNT(*) FROM usuarios WHERE usuario = ?');
    $st->execute(['admin']);
    if ((int)$st->fetchColumn() === 0) {
        $ins = $pdo->prepare('INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)');
        $ins->execute(['Administrador', 'admin', password_hash('admin123', PASSWORD_DEFAULT), 'admin']);
        $pasos[] = 'Usuario administrador creado (admin / admin123).';
    } else {
        $pasos[] = 'El usuario administrador ya existía (sin cambios).';
    }

    $instalado = true;
} catch (Throwable $ex) {
    $instalado = false;
    $error = $ex->getMessage();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Instalación · <?= htmlspecialchars(APP_NAME) ?></title>
<link rel="stylesheet" href="assets/css/estilo.css">
</head>
<body>
<div class="login-wrap">
    <div class="login-card" style="max-width:560px">
        <div class="logo">☕</div>
        <h1>Instalación de <?= htmlspecialchars(APP_NAME) ?></h1>
        <?php if ($instalado): ?>
            <div class="alert alert-success mt-2">¡Instalación completada con éxito!</div>
            <ul class="small" style="margin:12px 0 18px 18px">
                <?php foreach ($pasos as $p): ?><li><?= htmlspecialchars($p) ?></li><?php endforeach; ?>
            </ul>
            <a class="btn btn-primary" href="index.php" style="width:100%;justify-content:center">Ir al acceso del sistema</a>
        <?php else: ?>
            <div class="alert alert-error mt-2">Error durante la instalación</div>
            <p class="small"><?= htmlspecialchars($error) ?></p>
            <p class="small muted mt-2">Verifica que MySQL esté activo y que las credenciales en <code>config/config.php</code> sean correctas.</p>
        <?php endif; ?>
    </div>
</div>
</body>
</html>
