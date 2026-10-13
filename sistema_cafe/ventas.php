<?php
/**
 * MÓDULO 3 · Gestión de Venta
 * Registra una venta de café a un cliente/acreedor (en bolívares),
 * con financiamiento de hasta una semana.
 */
$PAGE = 'ventas';
require_once __DIR__ . '/includes/header.php';

$pdo = db();
$errores = [];

/** Costo promedio ponderado (USD/kg) de un tipo de café según las compras. */
function costo_promedio_usd(int $tipoId): float
{
    $st = db()->prepare(
        'SELECT COALESCE(SUM(monto_usd) / NULLIF(SUM(cantidad_kg), 0), 0)
         FROM compra_detalle WHERE tipo_cafe_id = ?'
    );
    $st->execute([$tipoId]);
    return (float)$st->fetchColumn();
}

/* --------------------------- PROCESAR --------------------------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $accion = $_POST['accion'] ?? 'crear';

    /* --- Registrar pago de una venta --- */
    if ($accion === 'pagar') {
        $st = $pdo->prepare("UPDATE ventas SET estado_pago = 'pagada', fecha_pago = CURDATE()
                             WHERE id = ? AND estado_pago = 'pendiente'");
        $st->execute([(int)($_POST['id'] ?? 0)]);
        flash('Pago registrado correctamente.');
        redirect('ventas.php');
    }

    /* --- Anular venta --- */
    if ($accion === 'anular') {
        $st = $pdo->prepare("UPDATE ventas SET estado_pago = 'anulada' WHERE id = ? AND estado_pago <> 'anulada'");
        $st->execute([(int)($_POST['id'] ?? 0)]);
        flash('Venta anulada.');
        redirect('ventas.php');
    }

    /* --- Crear venta --- */
    if ($accion === 'crear') {
        $cliente_id = (int)($_POST['cliente_id'] ?? 0);
        $fecha      = trim($_POST['fecha'] ?? '');
        $vencimiento= trim($_POST['fecha_vencimiento'] ?? '');
        $tasa       = (float)str_replace(',', '.', $_POST['tasa_cambio'] ?? '0');
        $observacion= trim($_POST['observacion'] ?? '');
        $tipos      = $_POST['tipo_cafe_id'] ?? [];
        $cantidades = $_POST['cantidad_kg'] ?? [];
        $precios    = $_POST['precio_bs_kg'] ?? [];

        if ($cliente_id <= 0)                                  $errores[] = 'Debes seleccionar un cliente.';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha))      $errores[] = 'La fecha no es válida.';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $vencimiento)) $errores[] = 'La fecha de vencimiento no es válida.';
        if ($tasa <= 0)                                        $errores[] = 'La tasa de cambio debe ser mayor a 0.';

        if (!$errores) {
            $dias = (strtotime($vencimiento) - strtotime($fecha)) / 86400;
            if ($dias < 0)   $errores[] = 'El vencimiento no puede ser anterior a la fecha de la venta.';
            if ($dias > 7)   $errores[] = 'El financiamiento no puede superar una semana (7 días).';
        }

        $lineas = [];
        $totalBs = 0.0;
        if (!is_array($tipos) || count($tipos) === 0) {
            $errores[] = 'Debes agregar al menos un tipo de café.';
        } else {
            foreach ($tipos as $i => $tipoId) {
                $tipoId = (int)$tipoId;
                $cant   = (float)str_replace(',', '.', $cantidades[$i] ?? '0');
                $precio = (float)str_replace(',', '.', $precios[$i] ?? '0');
                if ($tipoId <= 0 && $cant <= 0 && $precio <= 0) continue;
                if ($tipoId <= 0) { $errores[] = 'Línea ' . ($i + 1) . ': tipo de café inválido.'; continue; }
                if ($cant <= 0)   { $errores[] = 'Línea ' . ($i + 1) . ': la cantidad en kg debe ser mayor a 0.'; continue; }
                if ($precio <= 0) { $errores[] = 'Línea ' . ($i + 1) . ': el precio por kg debe ser mayor a 0.'; continue; }
                $monto = round($cant * $precio, 2);
                $lineas[] = [
                    'tipo'  => $tipoId,
                    'cant'  => $cant,
                    'precio'=> $precio,
                    'costo' => costo_promedio_usd($tipoId),
                    'monto' => $monto,
                ];
                $totalBs += $monto;
            }
            if (!$lineas) $errores[] = 'Debes agregar al menos una línea de café válida.';
        }

        if (!$errores) {
            try {
                $pdo->beginTransaction();
                $folio = generar_folio('V', 'ventas');
                $st = $pdo->prepare('INSERT INTO ventas
                    (folio, cliente_id, fecha, fecha_vencimiento, tasa_cambio, total_bs, observacion, usuario_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                $st->execute([$folio, $cliente_id, $fecha, $vencimiento, $tasa, $totalBs, $observacion ?: null, $user['id']]);
                $ventaId = (int)$pdo->lastInsertId();

                $std = $pdo->prepare('INSERT INTO venta_detalle
                    (venta_id, tipo_cafe_id, cantidad_kg, precio_bs_kg, costo_usd_kg, monto_bs)
                    VALUES (?, ?, ?, ?, ?, ?)');
                foreach ($lineas as $l) {
                    $std->execute([$ventaId, $l['tipo'], $l['cant'], $l['precio'], $l['costo'], $l['monto']]);
                }
                $pdo->commit();
                flash('Venta ' . $folio . ' registrada por ' . bs($totalBs) . '.');
                redirect('ventas.php');
            } catch (Throwable $ex) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $errores[] = 'No se pudo registrar la venta: ' . $ex->getMessage();
            }
        }
    }
}

/* --------------------------- DATOS --------------------------- */
$clientes  = $pdo->query('SELECT id, nombre_negocio, rif FROM clientes WHERE activo = 1 ORDER BY nombre_negocio')->fetchAll();
$tiposCafe = $pdo->query('SELECT id, nombre FROM tipos_cafe WHERE activo = 1 ORDER BY id')->fetchAll();

// Costo promedio por tipo (para mostrar referencia)
$costoRef = [];
foreach ($tiposCafe as $t) { $costoRef[(int)$t['id']] = costo_promedio_usd((int)$t['id']); }

$ventas = $pdo->query('
    SELECT v.*, c.nombre_negocio,
           DATEDIFF(v.fecha_vencimiento, CURDATE()) AS dias
    FROM ventas v JOIN clientes c ON c.id = v.cliente_id
    ORDER BY v.id DESC LIMIT 25
')->fetchAll();

$detallesPorVenta = [];
if ($ventas) {
    $ids = array_column($ventas, 'id');
    $in  = implode(',', array_fill(0, count($ids), '?'));
    $st  = $pdo->prepare("SELECT d.*, tc.nombre AS tipo FROM venta_detalle d
                          JOIN tipos_cafe tc ON tc.id = d.tipo_cafe_id
                          WHERE d.venta_id IN ($in) ORDER BY d.id");
    $st->execute($ids);
    foreach ($st->fetchAll() as $d) {
        $detallesPorVenta[$d['venta_id']][] = $d;
    }
}
?>
<div class="page-head">
    <div>
        <h1>Registrar venta de café</h1>
        <p class="sub">Ventas a crédito (hasta 7 días) · montos en bolívares (Bs)</p>
    </div>
</div>

<?php foreach ($errores as $err): ?>
    <div class="alert alert-error"><?= e($err) ?></div>
<?php endforeach; ?>

<?php if (!$clientes): ?>
    <div class="alert alert-warning">No hay clientes activos. <a href="clientes.php">Registra uno primero</a>.</div>
<?php endif; ?>

<div class="card">
    <h2>Datos de la venta</h2>
    <form method="post" data-validar id="formVenta" novalidate>
        <?= csrf_field() ?>
        <input type="hidden" name="accion" value="crear">
        <div class="form-grid">
            <div class="field">
                <label>Cliente <span class="req">*</span></label>
                <select name="cliente_id" required>
                    <option value="">— Seleccione negocio —</option>
                    <?php foreach ($clientes as $c): ?>
                        <option value="<?= (int)$c['id'] ?>"><?= e($c['nombre_negocio']) ?> (<?= e($c['rif']) ?>)</option>
                    <?php endforeach; ?>
                </select>
                <span class="error-msg">Selecciona un cliente.</span>
            </div>
            <div class="field">
                <label>Fecha de venta <span class="req">*</span></label>
                <input type="date" name="fecha" id="fecha" required value="<?= date('Y-m-d') ?>" max="<?= date('Y-m-d') ?>">
                <span class="error-msg">Fecha requerida.</span>
            </div>
            <div class="field">
                <label>Vencimiento (máx. 7 días) <span class="req">*</span></label>
                <input type="date" name="fecha_vencimiento" id="vencimiento" required value="<?= date('Y-m-d', strtotime('+7 day')) ?>" max="<?= date('Y-m-d', strtotime('+7 day')) ?>">
                <span class="error-msg">Máximo 7 días desde la fecha de venta.</span>
            </div>
            <div class="field">
                <label>Tasa de cambio (Bs/$) <span class="req">*</span></label>
                <input type="number" name="tasa_cambio" id="tasa" required min="0.01" step="0.01" data-validate="positivo" value="<?= number_format($tasa, 2, '.', '') ?>">
                <span class="error-msg">Tasa inválida.</span>
            </div>
        </div>

        <h2 class="mt-3">Detalle por tipo de café</h2>
        <p class="small muted mb-0">Costo de referencia por tipo (USD/kg): <?php
            echo implode(' · ', array_map(fn($t) => e($t['nombre']) . ' ' . usd($costoRef[(int)$t['id']]), $tiposCafe));
        ?></p>
        <div id="lineas" class="mt-1"></div>
        <button type="button" class="btn" onclick="agregarLinea()">➕ Agregar tipo de café</button>

        <div class="split mt-3">
            <div class="field">
                <label>Observación (opcional)</label>
                <input type="text" name="observacion" maxlength="255" placeholder="Financiamiento a 7 días...">
            </div>
            <div class="totales-box">
                <div class="fila total"><span>Total venta</span> <span id="totalGeneral">Bs 0,00</span></div>
            </div>
        </div>

        <div class="form-actions">
            <button type="submit" class="btn btn-success" <?= !$clientes ? 'disabled' : '' ?>>Guardar venta</button>
        </div>
    </form>
</div>

<div class="card">
    <h2>Últimas ventas registradas</h2>
    <div class="table-wrap">
        <table>
            <thead>
                <tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Vence</th><th class="text-right">Total (Bs)</th><th class="text-center">Estado</th><th class="text-center">Detalle</th><th class="text-center">Acciones</th></tr>
            </thead>
            <tbody>
                <?php if (!$ventas): ?>
                    <tr><td colspan="8" class="text-center muted">Aún no hay ventas registradas.</td></tr>
                <?php endif; ?>
                <?php foreach ($ventas as $v): $det = $detallesPorVenta[$v['id']] ?? []; ?>
                    <tr>
                        <td class="mono"><?= e($v['folio']) ?></td>
                        <td><?= e($v['nombre_negocio']) ?></td>
                        <td><?= fecha($v['fecha']) ?></td>
                        <td><?= fecha($v['fecha_vencimiento']) ?></td>
                        <td class="text-right mono"><?= bs($v['total_bs']) ?></td>
                        <td class="text-center">
                            <?php if ($v['estado_pago'] === 'pagada'): ?>
                                <span class="tag tag-pag">Pagada</span>
                            <?php elseif ($v['estado_pago'] === 'anulada'): ?>
                                <span class="tag tag-anu">Anulada</span>
                            <?php elseif ((int)$v['dias'] < 0): ?>
                                <span class="tag tag-venc">Vencida</span>
                            <?php else: ?>
                                <span class="tag tag-pend">Pendiente (<?= (int)$v['dias'] ?>d)</span>
                            <?php endif; ?>
                        </td>
                        <td class="text-center">
                            <details>
                                <summary class="small"><?= count($det) ?> línea(s)</summary>
                                <table class="mt-1">
                                    <?php foreach ($det as $d): ?>
                                        <tr>
                                            <td><?= e($d['tipo']) ?></td>
                                            <td class="text-right mono"><?= kg($d['cantidad_kg']) ?></td>
                                            <td class="text-right mono"><?= bs($d['precio_bs_kg']) ?>/kg</td>
                                            <td class="text-right mono"><?= bs($d['monto_bs']) ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </table>
                            </details>
                        </td>
                        <td class="text-center">
                            <div class="row" style="justify-content:center;gap:6px">
                                <?php if ($v['estado_pago'] === 'pendiente'): ?>
                                    <form method="post" data-confirm="¿Registrar el pago de esta venta?">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="accion" value="pagar">
                                        <input type="hidden" name="id" value="<?= (int)$v['id'] ?>">
                                        <button class="btn btn-sm btn-success">Cobrar</button>
                                    </form>
                                    <form method="post" data-confirm="¿Anular esta venta? Esta acción no se puede deshacer.">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="accion" value="anular">
                                        <input type="hidden" name="id" value="<?= (int)$v['id'] ?>">
                                        <button class="btn btn-sm btn-danger">Anular</button>
                                    </form>
                                <?php else: ?>
                                    <span class="muted small">—</span>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<template id="tplLinea">
    <div class="linea-input">
        <div class="field">
            <label>Tipo de café</label>
            <select name="tipo_cafe_id[]" required class="sel-tipo">
                <option value="">— Seleccione —</option>
                <?php foreach ($tiposCafe as $t): ?>
                    <option value="<?= (int)$t['id'] ?>"><?= e($t['nombre']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="field">
            <label>Cantidad (kg)</label>
            <input type="number" name="cantidad_kg[]" min="0.01" step="0.01" required class="inp-cant" placeholder="0.00">
        </div>
        <div class="field">
            <label>Precio Bs/kg</label>
            <input type="number" name="precio_bs_kg[]" min="0.01" step="0.01" required class="inp-precio" placeholder="0.00">
        </div>
        <div class="field">
            <label>Monto Bs</label>
            <input type="text" class="inp-monto" readonly value="0,00">
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.linea-input').remove(); recalcular()">✕</button>
    </div>
</template>

<script>
const tpl = document.getElementById('tplLinea').content;
const cont = document.getElementById('lineas');
const fmtBs = n => 'Bs ' + (Number(n)||0).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2});

function agregarLinea() {
    cont.appendChild(tpl.cloneNode(true));
    recalcular();
}
function recalcular() {
    let total = 0;
    cont.querySelectorAll('.linea-input').forEach(row => {
        const cant = parseFloat(row.querySelector('.inp-cant').value) || 0;
        const precio = parseFloat(row.querySelector('.inp-precio').value) || 0;
        const monto = cant * precio;
        row.querySelector('.inp-monto').value = monto.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2});
        total += monto;
    });
    document.getElementById('totalGeneral').textContent = fmtBs(total);
}

// Control de fechas: vencimiento máx. 7 días desde la fecha de venta
const fecha = document.getElementById('fecha');
const venc = document.getElementById('vencimiento');
function ajustarFechas() {
    if (!fecha.value) return;
    const f = new Date(fecha.value + 'T00:00:00');
    const max = new Date(f); max.setDate(max.getDate() + 7);
    const iso = d => d.toISOString().slice(0,10);
    venc.min = fecha.value;
    venc.max = iso(max);
    if (venc.value < fecha.value || venc.value > iso(max)) venc.value = iso(max);
}
fecha.addEventListener('change', ajustarFechas);
ajustarFechas();

cont.addEventListener('input', recalcular);
agregarLinea();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
