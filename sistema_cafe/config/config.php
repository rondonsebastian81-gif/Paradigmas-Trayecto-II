<?php
/**
 * Configuración general del sistema "Café Control".
 * Ajusta aquí las credenciales de la base de datos según tu servidor (XAMPP/WAMP).
 */

define('APP_NAME', 'Café Control');
define('APP_VERSION', '1.0');

// --- Base de datos ---
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'cafe_db');
define('DB_USER', 'root');
define('DB_PASS', '');          // En XAMPP por defecto va vacío. Cámbialo si tu MySQL tiene clave.
define('DB_CHARSET', 'utf8mb4');

// Valor por defecto de la tasa de cambio (Bs por dólar) si no existe en la BD.
define('TASA_CAMBIO_DEFAULT', 36.50);

// Zona horaria
date_default_timezone_set('America/Caracas');

// Mostrar errores durante el desarrollo (en producción ponlo en 0)
define('DEBUG', true);
if (DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}
