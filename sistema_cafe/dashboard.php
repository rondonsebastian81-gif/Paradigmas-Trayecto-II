<?php
/**
 * Panel de inicio con indicadores generales.
 */
$PAGE = 'dashboard';
require_once __DIR__ . '/includes/header.php';

$pdo = db();

// --- Stock por tipo (compras - ventas) ---
$sqlStock = "
  SELECT tc.id, tc.nombre,
    COALESCE((SELECT SUM(cd.cantidad_kg) FROM compra_detalle cd WHERE cd.tipo_cafe_id = tc.id), 0) AS comprado,
    COALESCE((SELECT SUM(vd.cantidad_kg) FROM venta_detalle vd
              JOIN ventas v ON v.id = vd.venta_id AND v.estado_pago <> 'anulada'
              WHERE vd.tipo_cafe_id = tc.id), 0) AS vendido
  FROM tipos_cafe tc WHERE tc.activo = 1 ORDER BY tc.id";
$stock = $pdo->query($sqlStock)->fetchAll();
$totalStock = 0;
foreach ($stock as &$s) { $s['stock'] = (float)$s['comprado'] - (float)$s['vendido']; $totalStock += $s['stock']; }
unset($s);

// --- Ventas de hoy ---
$ventasHoy = (float)$pdo->query("SELECT COALESCE(SUM(total_bs),0) FROM ventas WHERE fecha = CURDATE() AND estado_pago <> 'anulada'")->fetchColumn();
$cantVentasHoy = (int)$pdo->query("SELECT COUNT(*) FROM ventas WHERE fecha = CURDATE() AND estado_pago <> 'anulada'")->fetchColumn();

// --- Compras de hoy (USD) ---
$comprasHoy = (float)$pdo->query("SELECT COALESCE(SUM(total_usd),0) FROM compras WHERE fecha = CURDATE()")->fetchColumn();

// --- Cuentas por cobrar (ventas pendientes) ---
$porCobrar = (float)$pdo->query("SELECT COALESCE(SUM(total_bs),0) FROM ventas WHERE estado_pago = 'pendiente'")->fetchColumn();
$cantPendientes = (int)$pdo->query("SELECT COUNT(*) FROM ventas WHERE estado_pago = 'pendiente'")->fetchColumn();

// --- Ganancia de hoy (Bs): monto_bs - costo convertido ---
$sqlGananciaHoy = "
  SELECT COALESCE(SUM(vd.monto_bs - (vd.cantidad_kg * vd.costo_usd_kg * v.tasa_cambio)), 0)
  FROM venta_detalle vd JOIN ventas v ON v.id = vd.venta_id
  WHERE v.fecha = CURDATE() AND v.estado_pago <> 'anulada'";
$gananciaHoy = (float)$pdo->query($sqlGananciaHoy)->fetchColumn();

// --- Ventas pendientes por vencer (próximos 7 días) ---
$porVencer = $pdo->query("
  SELECT v.folio, c.nombre_negocio, v.fecha_vencimiento, v.total_bs,
         DATEDIFF(v.fecha_vencimiento, CURDATE()) AS dias
  FROM ventas v JOIN clientes c ON c.id = v.cliente_id
  WHERE v.estado_pago = 'pendiente'
  ORDER BY v.fecha_vencimiento ASC LIMIT 8
")->fetchAll();

// --- Últimas ventas ---
$ultimas = $pdo->query("
  SELECT v.folio, c.nombre_negocio, v.fecha, v.total_bs, v.estado_pago
  FROM ventas v JOIN clientes c ON c.id = v.cliente_id
  ORDER BY v.id DESC LIMIT 6
")->fetchAll();
?>
<div class="page-head">
    <div>
        <h1>Panel de inicio</h1>
        <p class="sub">Resumen general · <?= date('d/m/Y') ?></p>
    </div>
    <div class="row">
        <a class="btn btn-primary" href="compras.php">🛒 Nueva compra</a>
        <a class="btn btn-success" href="ventas.php">💰 Nueva venta</a>
    </div>
</div>

<div class="metrics">
    <div class="metric">
        <div class="label">Ventas de hoy</div>
        <div class="value"><?= bs($ventasHoy) ?></div>
        <div class="hint"><?= $cantVentasHoy ?> venta(s)</div>
    </div>
    <div class="metric verde">
        <div class="label">Ganancia de hoy</div>
        <div class="value"><?= bs($gananciaHoy) ?></div>
        <div class="hint">Ventas menos costo</div>
    </div>
    <div class="metric ambar">
        <div class="label">Cuentas por cobrar</div>
        <div class="value"><?= bs($porCobrar) ?></div>
        <div class="hint"><?= $cantPendientes ?> factura(s) pendiente(s)</div>
    </div>
    <div class="metric">
        <div class="label">Compras de hoy</div>
        <div class="value"><?= usd($comprasHoy) ?></div>
        <div class="hint">Pagos de contado</div>
    </div>
    <div class="metric">
        <div class="label">Inventario total</div>
        <div class="value"><?= kg($totalStock) ?></div>
        <div class="hint">Disponible en depósito</div>
    </div>
</div>

<div class="split">
    <div class="card">
        <h2>Inventario por tipo de café</h2>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th class="text-right">Comprado</th>
                        <th class="text-right">Vendido</th>
                        <th class="text-right">Disponible</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($stock as $s): ?>
                        <tr>
                            <td><strong><?= e($s['nombre']) ?></strong></td>
                            <td class="text-right mono"><?= kg($s['comprado']) ?></td>
                            <td class="text-right mono"><?= kg($s['vendido']) ?></td>
                            <td class="text-right mono"><strong><?= kg($s['stock']) ?></strong></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <div class="card">
        <h2>Cuentas por cobrar (próximas)</h2>
        <?php if (!$porVencer): ?>
            <p class="muted small">No hay cuentas por cobrar pendientes.</p>
        <?php else: ?>
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Folio</th><th>Cliente</th><th class="text-right">Monto</th><th class="text-center">Vence</th></tr></thead>
                    <tbody>
                        <?php foreach ($porVencer as $p): ?>
                            <tr>
                                <td class="mono"><?= e($p['folio']) ?></td>
                                <td><?= e($p['nombre_negocio']) ?></td>
                                <td class="text-right mono"><?= bs($p['total_bs']) ?></td>
                                <td class="text-center">
                                    <?php $d = (int)$p['dias']; ?>
                                    <?php if ($d < 0): ?>
                                        <span class="tag tag-venc">Vencida (<?= abs($d) ?>d)</span>
                                    <?php elseif ($d <= 2): ?>
                                        <span class="tag tag-pend"><?= $d ?>d</span>
                                    <?php else: ?>
                                        <span class="tag tag-on"><?= $d ?>d</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<div class="card">
    <h2>Últimas ventas</h2>
    <?php if (!$ultimas): ?>
        <p class="muted small">Aún no se registran ventas.</p>
    <?php else: ?>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th class="text-right">Total</th><th class="text-center">Estado</th></tr></thead>
                <tbody>
                    <?php foreach ($ultimas as $v): ?>
                        <tr>
                            <td class="mono"><?= e($v['folio']) ?></td>
                            <td><?= e($v['nombre_negocio']) ?></td>
                            <td><?= fecha($v['fecha']) ?></td>
                            <td class="text-right mono"><?= bs($v['total_bs']) ?></td>
                            <td class="text-center"><?php
                                echo match($v['estado_pago']) {
                                    'pagada' => '<span class="tag tag-pag">Pagada</span>',
                                    'anulada'=> '<span class="tag tag-anu">Anulada</span>',
                                    default  => '<span class="tag tag-pend">Pendiente</span>',
                                };
                            ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
