<?php
/**
 * Manejo de sesión y autenticación / autorización.
 */
require_once __DIR__ . '/functions.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/** Usuario autenticado actual o null. */
function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

/** Exige que haya sesión iniciada. */
function require_login(): void
{
    if (!current_user()) {
        redirect('index.php?msg=login');
    }
}

/** ¿El usuario actual es administrador? */
function is_admin(): bool
{
    return (current_user()['rol'] ?? '') === 'admin';
}

/** Exige rol administrador. */
function require_admin(): void
{
    require_login();
    if (!is_admin()) {
        flash('No tienes permisos para acceder a esa sección.', 'error');
        redirect('dashboard.php');
    }
}

/** Intenta iniciar sesión. Devuelve [exito(bool), mensaje]. */
function attempt_login(string $usuario, string $clave): array
{
    $st = db()->prepare('SELECT * FROM usuarios WHERE usuario = ? LIMIT 1');
    $st->execute([trim($usuario)]);
    $u = $st->fetch();

    if (!$u || !password_verify($clave, $u['password_hash'])) {
        return [false, 'Usuario o contraseña incorrectos.'];
    }
    if ((int)$u['activo'] !== 1) {
        return [false, 'El usuario está desactivado. Contacta al administrador.'];
    }

    $_SESSION['user'] = [
        'id'     => (int)$u['id'],
        'nombre' => $u['nombre'],
        'usuario'=> $u['usuario'],
        'rol'    => $u['rol'],
    ];
    return [true, 'Bienvenido ' . $u['nombre']];
}

/** Cierra la sesión. */
function logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}
