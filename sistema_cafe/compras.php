<?php
/**
 * MÓDULO 3 · Gestión de Compra
 * Registra una compra de café a un proveedor (al contado, precios en dólares).
 * Selecciona proveedor, tipos de café, cantidad en kg, precio por kg y fecha.
 */
$PAGE = 'compras';
require_once __DIR__ . '/includes/header.php';

$pdo = db();
$errores = [];

/* --------------------------- PROCESAR --------------------------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();

    $proveedor_id = (int)($_POST['proveedor_id'] ?? 0);
    $fecha        = trim($_POST['fecha'] ?? '');
    $observacion  = trim($_POST['observacion'] ?? '');
    $tipos        = $_POST['tipo_cafe_id'] ?? [];
    $cantidades   = $_POST['cantidad_kg'] ?? [];
    $precios      = $_POST['precio_usd_kg'] ?? [];

    if ($proveedor_id <= 0)                                  $errores[] = 'Debes seleccionar un proveedor.';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha))        $errores[] = 'La fecha no es válida.';

    // Validar líneas
    $lineas = [];
    $totalUsd = 0.0;
    if (!is_array($tipos) || count($tipos) === 0) {
        $errores[] = 'Debes agregar al menos un tipo de café.';
    } else {
        foreach ($tipos as $i => $tipoId) {
            $tipoId = (int)$tipoId;
            $cant   = (float)str_replace(',', '.', $cantidades[$i] ?? '0');
            $precio = (float)str_replace(',', '.', $precios[$i] ?? '0');
            if ($tipoId <= 0 && $cant <= 0 && $precio <= 0) continue; // línea vacía
            if ($tipoId <= 0)   { $errores[] = 'Línea ' . ($i + 1) . ': tipo de café inválido.'; continue; }
            if ($cant <= 0)     { $errores[] = 'Línea ' . ($i + 1) . ': la cantidad en kg debe ser mayor a 0.'; continue; }
            if ($precio <= 0)   { $errores[] = 'Línea ' . ($i + 1) . ': el precio por kg debe ser mayor a 0.'; continue; }
            $monto = round($cant * $precio, 2);
            $lineas[] = ['tipo' => $tipoId, 'cant' => $cant, 'precio' => $precio, 'monto' => $monto];
            $totalUsd += $monto;
        }
        if (!$lineas) $errores[] = 'Debes agregar al menos una línea de café válida.';
    }

    if (!$errores) {
        try {
            $pdo->beginTransaction();
            $folio = generar_folio('C', 'compras');
            $st = $pdo->prepare('INSERT INTO compras (folio, proveedor_id, fecha, total_usd, observacion, usuario_id)
                                 VALUES (?, ?, ?, ?, ?, ?)');
            $st->execute([$folio, $proveedor_id, $fecha, $totalUsd, $observacion ?: null, $user['id']]);
            $compraId = (int)$pdo->lastInsertId();

            $std = $pdo->prepare('INSERT INTO compra_detalle (compra_id, tipo_cafe_id, cantidad_kg, precio_usd_kg, monto_usd)
                                  VALUES (?, ?, ?, ?, ?)');
            foreach ($lineas as $l) {
                $std->execute([$compraId, $l['tipo'], $l['cant'], $l['precio'], $l['monto']]);
            }
            $pdo->commit();
            flash('Compra ' . $folio . ' registrada por ' . usd($totalUsd) . '.');
            redirect('compras.php');
        } catch (Throwable $ex) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            $errores[] = 'No se pudo registrar la compra: ' . $ex->getMessage();
        }
    }
}

/* --------------------------- DATOS --------------------------- */
$proveedores = $pdo->query('SELECT id, nombre_negocio, rif FROM proveedores WHERE activo = 1 ORDER BY nombre_negocio')->fetchAll();
$tiposCafe   = $pdo->query('SELECT id, nombre FROM tipos_cafe WHERE activo = 1 ORDER BY id')->fetchAll();

$compras = $pdo->query('
    SELECT c.*, p.nombre_negocio
    FROM compras c JOIN proveedores p ON p.id = c.proveedor_id
    ORDER BY c.id DESC LIMIT 25
')->fetchAll();

// Detalles agrupados de las compras listadas
$detallesPorCompra = [];
if ($compras) {
    $ids = array_column($compras, 'id');
    $in  = implode(',', array_fill(0, count($ids), '?'));
    $st  = $pdo->prepare("SELECT d.*, tc.nombre AS tipo FROM compra_detalle d
                          JOIN tipos_cafe tc ON tc.id = d.tipo_cafe_id
                          WHERE d.compra_id IN ($in) ORDER BY d.id");
    $st->execute($ids);
    foreach ($st->fetchAll() as $d) {
        $detallesPorCompra[$d['compra_id']][] = $d;
    }
}
?>
<div class="page-head">
    <div>
        <h1>Registrar compra de café</h1>
        <p class="sub">Compras al contado a proveedores · montos en dólares (USD)</p>
    </div>
</div>

<?php foreach ($errores as $err): ?>
    <div class="alert alert-error"><?= e($err) ?></div>
<?php endforeach; ?>

<?php if (!$proveedores): ?>
    <div class="alert alert-warning">No hay proveedores activos. <a href="proveedores.php">Registra uno primero</a>.</div>
<?php endif; ?>

<div class="card">
    <h2>Datos de la compra</h2>
    <form method="post" data-validar id="formCompra" novalidate>
        <?= csrf_field() ?>
        <div class="form-grid">
            <div class="field">
                <label>Proveedor <span class="req">*</span></label>
                <select name="proveedor_id" required>
                    <option value="">— Seleccione negocio —</option>
                    <?php foreach ($proveedores as $p): ?>
                        <option value="<?= (int)$p['id'] ?>"><?= e($p['nombre_negocio']) ?> (<?= e($p['rif']) ?>)</option>
                    <?php endforeach; ?>
                </select>
                <span class="error-msg">Selecciona un proveedor.</span>
            </div>
            <div class="field">
                <label>Fecha de compra <span class="req">*</span></label>
                <input type="date" name="fecha" required value="<?= date('Y-m-d') ?>" max="<?= date('Y-m-d') ?>">
                <span class="error-msg">Fecha requerida.</span>
            </div>
        </div>

        <h2 class="mt-3">Detalle por tipo de café</h2>
        <div id="lineas"></div>
        <button type="button" class="btn" onclick="agregarLinea()">➕ Agregar tipo de café</button>

        <div class="split mt-3">
            <div class="field">
                <label>Observación (opcional)</label>
                <input type="text" name="observacion" maxlength="255" placeholder="Pago de contado...">
            </div>
            <div class="totales-box">
                <div class="fila total"><span>Total compra</span> <span id="totalGeneral">$ 0.00</span></div>
            </div>
        </div>

        <div class="form-actions">
            <button type="submit" class="btn btn-primary" <?= !$proveedores ? 'disabled' : '' ?>>Guardar compra</button>
        </div>
    </form>
</div>

<div class="card">
    <h2>Últimas compras registradas</h2>
    <div class="table-wrap">
        <table>
            <thead>
                <tr><th>Folio</th><th>Proveedor</th><th>Fecha</th><th class="text-right">Total (USD)</th><th class="text-center">Detalle</th></tr>
            </thead>
            <tbody>
                <?php if (!$compras): ?>
                    <tr><td colspan="5" class="text-center muted">Aún no hay compras registradas.</td></tr>
                <?php endif; ?>
                <?php foreach ($compras as $c): $det = $detallesPorCompra[$c['id']] ?? []; ?>
                    <tr>
                        <td class="mono"><?= e($c['folio']) ?></td>
                        <td><?= e($c['nombre_negocio']) ?></td>
                        <td><?= fecha($c['fecha']) ?></td>
                        <td class="text-right mono"><?= usd($c['total_usd']) ?></td>
                        <td class="text-center">
                            <details>
                                <summary class="small"><?= count($det) ?> línea(s)</summary>
                                <table class="mt-1">
                                    <?php foreach ($det as $d): ?>
                                        <tr>
                                            <td><?= e($d['tipo']) ?></td>
                                            <td class="text-right mono"><?= kg($d['cantidad_kg']) ?></td>
                                            <td class="text-right mono"><?= usd($d['precio_usd_kg']) ?>/kg</td>
                                            <td class="text-right mono"><?= usd($d['monto_usd']) ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </table>
                            </details>
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
            <label>Precio $/kg</label>
            <input type="number" name="precio_usd_kg[]" min="0.01" step="0.01" required class="inp-precio" placeholder="0.00">
        </div>
        <div class="field">
            <label>Monto $</label>
            <input type="text" class="inp-monto" readonly value="0.00">
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.linea-input').remove(); recalcular()">✕</button>
    </div>
</template>

<script>
const tpl = document.getElementById('tplLinea').content;
const cont = document.getElementById('lineas');

function agregarLinea() {
    const node = tpl.cloneNode(true);
    cont.appendChild(node);
    recalcular();
}
function recalcular() {
    let total = 0;
    cont.querySelectorAll('.linea-input').forEach(row => {
        const cant = parseFloat(row.querySelector('.inp-cant').value) || 0;
        const precio = parseFloat(row.querySelector('.inp-precio').value) || 0;
        const monto = cant * precio;
        row.querySelector('.inp-monto').value = monto.toFixed(2);
        total += monto;
    });
    document.getElementById('totalGeneral').textContent = '$ ' + total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}
cont.addEventListener('input', recalcular);
agregarLinea();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
