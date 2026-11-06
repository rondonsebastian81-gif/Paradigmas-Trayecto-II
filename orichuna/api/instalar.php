<?php
/* ============================================================
   ORICHUNA.CA · Instalador de la base de datos
   Ejecuta api/schema.sql. Es idempotente: no borra datos.

   Uso (navegador):  http://localhost/orichuna/api/instalar.php
   Uso (CLI):        C:\xampp\php\php.exe api\instalar.php
   ============================================================ */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', DB_HOST, DB_PORT);
    $pdo = new PDO($dsn, DB_USUARIO, DB_CLAVE, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    $sql = (string) file_get_contents(__DIR__ . '/schema.sql');

    // Se descartan las líneas de comentario antes de partir por ';'.
    $lineas = [];
    foreach (preg_split('/\R/', $sql) ?: [] as $linea) {
        $t = trim($linea);
        if ($t === '' || str_starts_with($t, '--')) {
            continue;
        }
        $lineas[] = $linea;
    }

    $ejecutadas = 0;
    foreach (explode(';', implode("\n", $lineas)) as $sentencia) {
        if (trim($sentencia) === '') {
            continue;
        }
        $pdo->exec($sentencia);
        $ejecutadas++;
    }

    // Migración para bases creadas antes del flujo de solicitudes de cupo.
    $columnas = [
        'hora_recogida' => "ALTER TABLE ticket ADD COLUMN hora_recogida VARCHAR(5) NOT NULL DEFAULT '' AFTER motivo",
        'solicitante'   => "ALTER TABLE ticket ADD COLUMN solicitante VARCHAR(40) NOT NULL DEFAULT '' AFTER hora_recogida",
    ];
    foreach ($columnas as $columna => $alter) {
        $existe = $pdo->query(
            'SHOW COLUMNS FROM ticket LIKE ' . $pdo->quote($columna)
        )->fetch();
        if (!$existe) {
            $pdo->exec($alter);
            $ejecutadas++;
        }
    }

    $indice = $pdo->query(
        "SHOW INDEX FROM ticket WHERE Key_name = 'idx_ticket_solicitante'"
    )->fetch();
    if (!$indice) {
        $pdo->exec('ALTER TABLE ticket ADD KEY idx_ticket_solicitante (solicitante)');
        $ejecutadas++;
    }

    echo "OK: base de datos '" . DB_NOMBRE . "' lista (" .
        $ejecutadas . " sentencias).\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo "ERROR: " . $e->getMessage() . "\n";
}
