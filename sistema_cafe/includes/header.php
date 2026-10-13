<?php
/**
 * Encabezado común: <head>, barra superior y menú lateral.
 * Requiere que $PAGE (identificador de página) esté definido antes de incluirlo.
 */
require_once __DIR__ . '/auth.php';
require_login();

$user = current_user();
$tasa = tasa_cambio();
$PAGE = $PAGE ?? '';

$menu = [
    ['id' => 'dashboard',   'titulo' => 'Inicio',              'url' => 'dashboard.php',   'icono' => '🏠', 'admin' => false],
    ['id' => 'proveedores', 'titulo' => 'Proveedores',         'url' => 'proveedores.php', 'icono' => '🏭', 'admin' => false],
    ['id' => 'clientes',    'titulo' => 'Clientes',            'url' => 'clientes.php',    'icono' => '🤝', 'admin' => false],
    ['id' => 'compras',     'titulo' => 'Registrar compra',    'url' => 'compras.php',     'icono' => '🛒', 'admin' => false],
    ['id' => 'ventas',      'titulo' => 'Registrar venta',     'url' => 'ventas.php',      'icono' => '💰', 'admin' => false],
    ['id' => 'reportes',    'titulo' => 'Reportes',            'url' => 'reportes.php',    'icono' => '📊', 'admin' => false],
    ['id' => 'usuarios',    'titulo' => 'Usuarios',            'url' => 'usuarios.php',    'icono' => '👤', 'admin' => true],
    ['id' => 'config',      'titulo' => 'Tasa de cambio',      'url' => 'configuracion.php', 'icono' => '⚙️', 'admin' => true],
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e(APP_NAME) ?></title>
<link rel="stylesheet" href="assets/css/estilo.css">
</head>
<body>
<header class="topbar">
    <div class="topbar-left">
        <button class="btn-menu" id="btnMenu" aria-label="Menú">☰</button>
        <span class="brand">☕ <?= e(APP_NAME) ?></span>
    </div>
    <div class="topbar-right">
        <span class="tasa-badge" title="Tasa de cambio">Tasa: Bs <?= number_format($tasa, 2, ',', '.') ?> / $</span>
        <span class="user-info"><?= e($user['nombre']) ?> <small>(<?= e($user['rol']) ?>)</small></span>
        <a class="btn btn-ghost" href="logout.php">Salir</a>
    </div>
</header>

<div class="layout">
    <aside class="sidebar" id="sidebar">
        <nav>
            <p class="nav-title">Módulos</p>
            <?php foreach ($menu as $m): ?>
                <?php if ($m['admin'] && !is_admin()) continue; ?>
                <a class="nav-link <?= $PAGE === $m['id'] ? 'active' : '' ?>" href="<?= e($m['url']) ?>">
                    <span class="nav-ico"><?= $m['icono'] ?></span> <?= e($m['titulo']) ?>
                </a>
            <?php endforeach; ?>
        </nav>
        <div class="sidebar-foot">
            <small><?= e(APP_NAME) ?> v<?= e(APP_VERSION) ?></small>
        </div>
    </aside>

    <main class="content">
        <?php foreach (get_flash() as $f): ?>
            <div class="alert alert-<?= e($f['tipo']) ?>"><?= e($f['mensaje']) ?></div>
        <?php endforeach; ?>
