<?php
/**
 * Funciones auxiliares del sistema.
 */
require_once __DIR__ . '/../config/database.php';

/** Escapa texto para salida HTML. */
function e($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

/** Redirige a una URL y termina la ejecución. */
function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

/** Guarda un mensaje flash. */
function flash(string $mensaje, string $tipo = 'success'): void
{
    $_SESSION['flash'][] = ['mensaje' => $mensaje, 'tipo' => $tipo];
}

/** Devuelve y limpia los mensajes flash. */
function get_flash(): array
{
    $f = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $f;
}

/** Genera (si hace falta) y devuelve el token CSRF. */
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/** Campo oculto con el token CSRF. */
function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

/** Verifica el token CSRF recibido (POST). */
function verify_csrf(): void
{
    $enviado = $_POST['csrf'] ?? '';
    if (!hash_equals($_SESSION['csrf'] ?? '', $enviado)) {
        http_response_code(419);
        die('Token de seguridad inválido. Recarga la página e inténtalo de nuevo.');
    }
}

/** Formatea un monto en bolívares. */
function bs($n): string
{
    return 'Bs ' . number_format((float)$n, 2, ',', '.');
}

/** Formatea un monto en dólares. */
function usd($n): string
{
    return '$ ' . number_format((float)$n, 2, '.', ',');
}

/** Formatea kilos. */
function kg($n): string
{
    return number_format((float)$n, 2, ',', '.') . ' kg';
}

/** Formatea una fecha Y-m-d a d/m/Y. */
function fecha(?string $f): string
{
    if (!$f) return '—';
    $t = strtotime($f);
    return $t ? date('d/m/Y', $t) : '—';
}

/** Lee un valor de configuración de la BD. */
function config_get(string $clave, $default = null)
{
    static $cache = [];
    if (array_key_exists($clave, $cache)) return $cache[$clave];
    $st = db()->prepare('SELECT valor FROM configuracion WHERE clave = ?');
    $st->execute([$clave]);
    $valor = $st->fetchColumn();
    $cache[$clave] = ($valor === false) ? $default : $valor;
    return $cache[$clave];
}

/** Actualiza un valor de configuración. */
function config_set(string $clave, $valor): void
{
    $st = db()->prepare(
        'INSERT INTO configuracion (clave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)'
    );
    $st->execute([$clave, (string)$valor]);
}

/** Tasa de cambio Bs/$ actual. */
function tasa_cambio(): float
{
    return (float) config_get('tasa_cambio', TASA_CAMBIO_DEFAULT);
}

/** Genera un folio correlativo con prefijo y fecha (ej: C-20261012-0001). */
function generar_folio(string $prefijo, string $tabla): string
{
    $hoy = date('Ymd');
    $st = db()->prepare("SELECT COUNT(*) FROM {$tabla} WHERE DATE(creado_en) = CURDATE()");
    $st->execute();
    $consecutivo = (int)$st->fetchColumn() + 1;
    return sprintf('%s-%s-%04d', $prefijo, $hoy, $consecutivo);
}

/** Devuelve true si el string no está vacío. */
function no_vacio($v): bool
{
    return isset($v) && trim((string)$v) !== '';
}

/** Valida RIF venezolano (J/V/E/G/P-12345678-9 aprox). */
function rif_valido(string $rif): bool
{
    return (bool) preg_match('/^[VEJPGvejpg]-?\d{7,9}-?\d?$/', trim($rif));
}

/** Valida cédula (números con puntos opcionales). */
function cedula_valida(string $cedula): bool
{
    return (bool) preg_match('/^\d{1,2}\.?\d{3}\.?\d{3}$/', trim($cedula));
}

/** Valida teléfono (números, +, -, espacios; al menos 7 dígitos). */
function telefono_valido(string $tel): bool
{
    if (!preg_match('/^[0-9+\-\s()]+$/', trim($tel))) return false;
    return strlen(preg_replace('/\D/', '', $tel)) >= 7;
}

/** Valida email. */
function email_valido(string $email): bool
{
    return (bool) filter_var(trim($email), FILTER_VALIDATE_EMAIL);
}
