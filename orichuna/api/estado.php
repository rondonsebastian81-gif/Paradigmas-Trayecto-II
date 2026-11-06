<?php
/* ============================================================
   ORICHUNA.CA · API de estado (persistencia en MySQL/MariaDB)

   GET    api/estado.php   -> devuelve todo el estado en JSON
                              (o "null" si todavía no hay datos)
   POST   api/estado.php   -> reemplaza el estado con el JSON recibido
   DELETE api/estado.php   -> borra todo (restablecer demostración)

   El JSON de ida y vuelta tiene exactamente la forma que producen
   EstacionServicio.datosParaGuardar() / desdeDatos() en modelos.js
   ============================================================ */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

date_default_timezone_set('UTC');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function responder($datos, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fallar(string $mensaje, int $codigo = 500): void
{
    error_log('[ORICHUNA] ' . $mensaje);
    responder(['error' => $mensaje], $codigo);
}

function leer_cuerpo(): array
{
    $crudo = file_get_contents('php://input');
    if ($crudo === false || trim($crudo) === '') {
        fallar('El cuerpo de la petición está vacío.', 400);
    }
    if (strlen($crudo) > 5 * 1024 * 1024) {
        fallar('El cuerpo de la petición es demasiado grande.', 413);
    }
    $datos = json_decode($crudo, true);
    if (!is_array($datos)) {
        fallar('JSON inválido.', 400);
    }
    return $datos;
}

/** Convierte un ISO-8601 en UTC ("2026-11-03T14:05:00.000Z") a DATETIME. */
function a_datetime($iso): string
{
    try {
        $fecha = new DateTimeImmutable((string) $iso, new DateTimeZone('UTC'));
        return $fecha->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return gmdate('Y-m-d H:i:s');
    }
}

/** Solo dígitos del teléfono (para la restricción de unicidad). */
function solo_digitos($texto): string
{
    return preg_replace('/[^0-9]/', '', (string) $texto) ?? '';
}

/** Recorta un texto al largo que admite la columna (sin romper acentos). */
function texto_recortado($valor, int $maximo): string
{
    $texto = trim((string) $valor);
    return function_exists('mb_substr')
        ? mb_substr($texto, 0, $maximo, 'UTF-8')
        : substr($texto, 0, $maximo);
}

/** Número obligatorio dentro de un rango; si no cumple, responde 422. */
function numero_estado($valor, string $campo, float $minimo, float $maximo): float
{
    if (!is_numeric($valor)) {
        fallar('El campo "' . $campo . '" debe ser numérico.', 422);
    }
    $numero = (float) $valor;
    if (!is_finite($numero) || $numero < $minimo || $numero > $maximo) {
        fallar(
            'El campo "' . $campo . '" debe estar entre ' . $minimo . ' y ' . $maximo . '.',
            422
        );
    }
    return $numero;
}

/** Hora "HH:MM" válida, devuelta siempre con dos dígitos en la hora. */
function hora_estado($valor, string $campo): string
{
    $hora = trim((string) $valor);
    if (!preg_match('/^([01]?\d|2[0-3]):[0-5]\d$/', $hora)) {
        fallar('El campo "' . $campo . '" debe ser una hora válida HH:MM.', 422);
    }
    return strlen($hora) === 4 ? '0' . $hora : $hora;
}

/** Hora "HH:MM" opcional: si viene vacía se guarda vacía. */
function hora_opcional($valor, string $campo): string
{
    $hora = trim((string) $valor);
    if ($hora === '') {
        return '';
    }
    return hora_estado($hora, $campo);
}

function leer_estado(PDO $pdo): ?array
{
    $cfg = $pdo->query(
        "SELECT DATE_FORMAT(fecha, '%Y-%m-%d')            AS fecha,
                combustible,
                TIME_FORMAT(hora_inicio, '%H:%i')          AS hora_inicio,
                TIME_FORMAT(hora_cierre, '%H:%i')          AS hora_cierre,
                cantidad_moto,
                cantidad_automovil,
                cantidad_camion,
                tiempo_asignacion_seg
           FROM configuracion
          WHERE id = 1"
    )->fetch();

    if (!$cfg) {
        return null; // todavía no hay estado guardado
    }

    $contador = $pdo->query(
        'SELECT ultimo_id FROM estado_app WHERE id = 1'
    )->fetch();

    $usuarios = $pdo->query(
        'SELECT clase, cedula, nombre, apellido, correo, telefono, verificado
           FROM usuario
          ORDER BY id'
    )->fetchAll();

    $tickets = $pdo->query(
        "SELECT t.id, t.turno, t.codigo, t.estatus, t.combustible, t.motivo,
                t.hora_recogida, t.solicitante,
                DATE_FORMAT(t.fecha, '%Y-%m-%dT%H:%i:%s.000Z') AS fecha,
                v.tipo, v.marca, v.modelo, v.placa, v.color
           FROM ticket t
           JOIN vehiculo v ON v.id = t.vehiculo_id
          ORDER BY t.id"
    )->fetchAll();

    return [
        'ultimoId' => $contador ? (int) $contador['ultimo_id'] : 0,
        'config'   => [
            'fecha'                => $cfg['fecha'],
            'combustible'          => (float) $cfg['combustible'],
            'horaInicio'           => $cfg['hora_inicio'],
            'horaCierre'           => $cfg['hora_cierre'],
            'cantidadMoto'         => (float) $cfg['cantidad_moto'],
            'cantidadAutomovil'    => (float) $cfg['cantidad_automovil'],
            'cantidadCamion'       => (float) $cfg['cantidad_camion'],
            'tiempoAsignacionSeg'  => (int) $cfg['tiempo_asignacion_seg'],
        ],
        'usuarios' => array_map(static function (array $u): array {
            return [
                'clase'      => $u['clase'],
                'cedula'     => $u['cedula'],
                'nombre'     => $u['nombre'],
                'apellido'   => $u['apellido'],
                'correo'     => $u['correo'],
                'telefono'   => $u['telefono'],
                'verificado' => (bool) $u['verificado'],
            ];
        }, $usuarios),
        'tickets' => array_map(static function (array $t): array {
            return [
                'id'          => (int) $t['id'],
                'turno'       => (int) $t['turno'],
                'codigo'      => (int) $t['codigo'],
                'estatus'     => $t['estatus'],
                'combustible' => $t['combustible'] === null
                    ? null
                    : (float) $t['combustible'],
                'motivo'      => $t['motivo'],
                'horaRecogida' => $t['hora_recogida'],
                'solicitante'  => $t['solicitante'],
                'fecha'       => $t['fecha'],
                'vehiculo'    => [
                    'tipo'   => $t['tipo'],
                    'marca'  => $t['marca'],
                    'modelo' => $t['modelo'],
                    'placa'  => $t['placa'],
                    'color'  => $t['color'],
                ],
            ];
        }, $tickets),
    ];
}

function guardar_estado(PDO $pdo, array $datos): void
{
    $cfg = $datos['config'] ?? null;
    if (!is_array($cfg)) {
        fallar('Falta el bloque "config" en el JSON.', 400);
    }
    $usuarios = is_array($datos['usuarios'] ?? null) ? $datos['usuarios'] : [];
    $tickets  = is_array($datos['tickets'] ?? null) ? $datos['tickets'] : [];

    /* --- Validación del servidor (última línea de defensa) ---------------
       La interfaz ya valida, pero la API se puede llamar directamente:
       aquí se rechaza cualquier configuración negativa o fuera de rango,
       horas imposibles y textos que no caben en las columnas. */
    $fecha = trim((string) ($cfg['fecha'] ?? ''));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        fallar('La fecha de configuración debe tener el formato AAAA-MM-DD.', 422);
    }
    $combustible = numero_estado($cfg['combustible'] ?? null, 'combustible', 0, 1000000);
    $horaInicio  = hora_estado($cfg['horaInicio'] ?? '', 'horaInicio');
    $horaCierre  = hora_estado($cfg['horaCierre'] ?? '', 'horaCierre');
    if ($horaInicio >= $horaCierre) {
        fallar('La hora de inicio debe ser anterior a la hora de cierre.', 422);
    }
    $cantidadMoto      = numero_estado($cfg['cantidadMoto'] ?? null, 'cantidadMoto', 0.5, 1000);
    $cantidadAutomovil = numero_estado($cfg['cantidadAutomovil'] ?? null, 'cantidadAutomovil', 0.5, 1000);
    $cantidadCamion    = numero_estado($cfg['cantidadCamion'] ?? null, 'cantidadCamion', 0.5, 1000);

    $tiempo = $cfg['tiempoAsignacionSeg'] ?? null;
    if (!is_numeric($tiempo) || (float) $tiempo != (int) $tiempo) {
        fallar('El tiempo de asignación debe ser un número entero de segundos.', 422);
    }
    $tiempo = (int) $tiempo;
    if ($tiempo < 10 || $tiempo > 3600) {
        fallar('El tiempo de asignación debe estar entre 10 y 3600 segundos.', 422);
    }

    $ultimoId = $datos['ultimoId'] ?? 0;
    if (!is_numeric($ultimoId) || (int) $ultimoId < 0) {
        fallar('El campo "ultimoId" debe ser un entero mayor o igual que 0.', 422);
    }
    $ultimoId = (int) $ultimoId;

    $pdo->beginTransaction();
    try {
        // Se reemplaza el estado completo: los volúmenes son pequeños.
        $pdo->exec('DELETE FROM ticket');
        $pdo->exec('DELETE FROM vehiculo');
        $pdo->exec('DELETE FROM usuario');

        $pdo->prepare(
            'INSERT INTO configuracion
                (id, fecha, combustible, hora_inicio, hora_cierre,
                 cantidad_moto, cantidad_automovil, cantidad_camion,
                 tiempo_asignacion_seg)
             VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                fecha                 = VALUES(fecha),
                combustible           = VALUES(combustible),
                hora_inicio           = VALUES(hora_inicio),
                hora_cierre           = VALUES(hora_cierre),
                cantidad_moto         = VALUES(cantidad_moto),
                cantidad_automovil    = VALUES(cantidad_automovil),
                cantidad_camion       = VALUES(cantidad_camion),
                tiempo_asignacion_seg = VALUES(tiempo_asignacion_seg)'
        )->execute([
            $fecha, $combustible, $horaInicio, $horaCierre,
            $cantidadMoto, $cantidadAutomovil, $cantidadCamion, $tiempo,
        ]);

        $pdo->prepare(
            'INSERT INTO estado_app (id, ultimo_id) VALUES (1, ?)
             ON DUPLICATE KEY UPDATE ultimo_id = VALUES(ultimo_id)'
        )->execute([$ultimoId]);

        $insUsuario = $pdo->prepare(
            'INSERT INTO usuario
                (cedula, nombre, apellido, correo, telefono,
                 telefono_digitos, clase, verificado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($usuarios as $u) {
            $clase = (string) ($u['clase'] ?? 'Empleado');
            if (!in_array($clase, ['Administrador', 'Empleado', 'Cliente'], true)) {
                $clase = 'Empleado';
            }
            $cedula   = texto_recortado($u['cedula'] ?? '', 20);
            $correo   = texto_recortado($u['correo'] ?? '', 150);
            $telefono = texto_recortado($u['telefono'] ?? '', 30);
            $digitos  = solo_digitos($telefono);
            if ($cedula === '' || $correo === '' || $digitos === '') {
                fallar('Cada usuario necesita cédula, correo y teléfono válidos.', 422);
            }
            $insUsuario->execute([
                $cedula,
                texto_recortado($u['nombre'] ?? '', 80),
                texto_recortado($u['apellido'] ?? '', 80),
                $correo,
                $telefono,
                $digitos,
                $clase,
                !empty($u['verificado']) ? 1 : 0,
            ]);
        }

        $insVehiculo = $pdo->prepare(
            'INSERT INTO vehiculo (tipo, marca, modelo, placa, color)
             VALUES (?, ?, ?, ?, ?)'
        );
        $insTicket = $pdo->prepare(
            'INSERT INTO ticket
                (id, turno, codigo, estatus, combustible, motivo,
                 hora_recogida, solicitante, fecha, vehiculo_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($tickets as $t) {
            $turno  = (int) ($t['turno'] ?? 0);
            $codigo = (int) ($t['codigo'] ?? 0);
            if ($turno < 1 || $turno > 20 || $codigo < 1 || $codigo > 999) {
                fallar('Cada ticket necesita un turno (1-20) y un código (1-999) válidos.', 422);
            }
            $veh = is_array($t['vehiculo'] ?? null) ? $t['vehiculo'] : [];
            $tipo = (string) ($veh['tipo'] ?? 'automovil');
            if (!in_array($tipo, ['moto', 'automovil', 'camion'], true)) {
                $tipo = 'automovil';
            }
            $insVehiculo->execute([
                $tipo,
                texto_recortado($veh['marca'] ?? '', 80),
                texto_recortado($veh['modelo'] ?? '', 80),
                strtoupper(texto_recortado($veh['placa'] ?? '', 10)),
                texto_recortado($veh['color'] ?? '', 60),
            ]);
            $vehiculoId = (int) $pdo->lastInsertId();

            $estatus = (string) ($t['estatus'] ?? 'pendiente');
            if (!in_array($estatus, ['pendiente', 'aceptado', 'cancelado'], true)) {
                $estatus = 'pendiente';
            }
            $combustibleTicket = $t['combustible'] ?? null;
            if ($combustibleTicket !== null) {
                $combustibleTicket = numero_estado(
                    $combustibleTicket,
                    'combustible del ticket',
                    0,
                    1000000
                );
            }

            $insTicket->execute([
                (int) ($t['id'] ?? 0),
                $turno,
                $codigo,
                $estatus,
                $combustibleTicket,
                texto_recortado($t['motivo'] ?? '', 255),
                hora_opcional($t['horaRecogida'] ?? '', 'horaRecogida del ticket'),
                texto_recortado($t['solicitante'] ?? '', 40),
                a_datetime($t['fecha'] ?? ''),
                $vehiculoId,
            ]);
        }

        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e->getCode() === '23000') {
            fallar('Hay datos duplicados (cédula, correo, teléfono o código de ticket).', 409);
        }
        throw $e;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function limpiar(PDO $pdo): void
{
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM ticket');
        $pdo->exec('DELETE FROM vehiculo');
        $pdo->exec('DELETE FROM usuario');
        $pdo->exec('DELETE FROM configuracion');
        $pdo->exec('DELETE FROM estado_app');
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

try {
    $pdo    = pdo();
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    switch ($metodo) {
        case 'GET':
            responder(leer_estado($pdo));

        case 'POST':
            guardar_estado($pdo, leer_cuerpo());
            responder(['ok' => true]);

        case 'DELETE':
            limpiar($pdo);
            responder(['ok' => true]);

        default:
            header('Allow: GET, POST, DELETE');
            responder(['error' => 'Método no permitido.'], 405);
    }
} catch (Throwable $e) {
    fallar($e->getMessage());
}
