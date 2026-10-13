<?php
/**
 * Página de acceso al sistema (login).
 */
require_once __DIR__ . '/includes/auth.php';

if (current_user()) {
    redirect('dashboard.php');
}

$usuario = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $usuario = trim($_POST['usuario'] ?? '');
    $clave   = $_POST['clave'] ?? '';

    if ($usuario === '' || $clave === '') {
        $error = 'Debes completar usuario y contraseña.';
    } else {
        [$ok, $msg] = attempt_login($usuario, $clave);
        if ($ok) {
            flash($msg, 'success');
            redirect('dashboard.php');
        }
        $error = $msg;
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Acceso · <?= e(APP_NAME) ?></title>
<link rel="stylesheet" href="assets/css/estilo.css">
</head>
<body>
<div class="login-wrap">
    <form class="login-card" method="post" data-validar novalidate>
        <div class="logo">☕</div>
        <h1><?= e(APP_NAME) ?></h1>
        <p class="sub">Compra y venta de café · Suave, Normal y Fuerte</p>

        <?php if ($error): ?>
            <div class="alert alert-error"><?= e($error) ?></div>
        <?php endif; ?>
        <?php if (($_GET['msg'] ?? '') === 'login'): ?>
            <div class="alert alert-warning">Inicia sesión para continuar.</div>
        <?php endif; ?>

        <?= csrf_field() ?>
        <div class="field">
            <label for="usuario">Usuario</label>
            <input type="text" id="usuario" name="usuario" value="<?= e($usuario) ?>" required autofocus autocomplete="username">
        </div>
        <div class="field">
            <label for="clave">Contraseña</label>
            <input type="password" id="clave" name="clave" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary">Ingresar</button>

        <p class="login-hint">Acceso por defecto: <strong>admin</strong> / <strong>admin123</strong></p>
    </form>
</div>
<script src="assets/js/app.js"></script>
</body>
</html>
