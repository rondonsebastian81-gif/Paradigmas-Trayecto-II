<?php
/**
 * MÓDULO 4 · Reportes
 *  1) Ganancias diarias y semanales, por negocio y general
 *  2) Cuentas por cobrar semanal
 *  3) Inventario por tipo de café            (reporte adicional)
 *  4) Compras por proveedor                  (reporte adicional)
 */
$PAGE = 'reportes';
require_once __DIR__ . '/includes/header.php';

$pdo = db();

$r     = $_GET['r'] ?? 'ganancias';
$desde = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['desde'] ?? '') ? $_GET['desde'] : date('Y-m-01');
$hasta = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['hasta'] ?? '') ? $_GET['hasta'] : date('Y-m-d');

$tabs = [
    'ganancias' => 'Ganancias',
    'cobrar'    => 'Cuentas por cobrar',
    'inventario'=> 'Inventario',
    'compras'   => 'Compras por proveedor',
];
if (!isset($tabs[$r])) $r = 'ganancias';

// Helper de rendimiento (Bs) a partir de ventas y costo
function margen(float $ventas, float $costo): float { return $ventas - $costo; }
?>
<div class="page-head">
    <div>
        <h1>Reportes</h1>
        <p class="sub">Análisis de compras, ventas y ganancias</p>
    </div>
    <button class="btn btn-primary no-print" onclick="window.print()">🖨️ Imprimir</button>
</div>

<div class="row no-print" style="gap:8px;margin-bottom:18px">
    <?php foreach ($tabs as $k => $label): ?>
        <a class="btn <?= $r === $k ? 'btn-primary' : '' ?>" href="reportes.php?r=<?= $k ?>&desde=<?= e($desde) ?>&hasta=<?= e($hasta) ?>"><?= e($label) ?></a>
    <?php endforeach; ?>
</div>

<?php if (in_array($r, ['ganancias', 'compras'], true)): ?>
<form class="card no-print" method="get">
    <input type="hidden" name="r" value="<?= e($r) ?>">
    <div class="form-grid">
        <div class="field">
            <label>Desde</label>
            <input type="date" name="desde" value="<?= e($desde) ?>">
        </div>
        <div class="field">
            <label>Hasta</label>
            <input type="date" name="hasta" value="<?= e($hasta) ?>">
        </div>
        <div class="field" style="justify-content:flex-end">
            <label>&nbsp;</label>
            <button class="btn btn-primary" type="submit">Aplicar rango</button>
        </div>
    </div>
    <p class="small muted mb-0">Rango aplicado: <strong><?= fecha($desde) ?></strong> al <strong><?= fecha($hasta) ?></strong></p>
</form>
<?php endif; ?>

<?php
/* =========================================================================
 *  REPORTE 1 · Ganancias diarias / semanales, por negocio y general
 * ========================================================================= */
if ($r === 'ganancias'):
    $base = "
        FROM venta_detalle vd
        JOIN ventas v   ON v.id = vd.venta_id
        JOIN clientes c ON c.id = v.cliente_id
        WHERE v.estado_pago <> 'anulada' AND v.fecha BETWEEN ? AND ?";
    $params = [$desde, $hasta];

    // --- Diario ---
    $st = $pdo->prepare("SELECT v.fecha AS periodo,
            SUM(vd.monto_bs) AS ventas,
            SUM(vd.cantidad_kg * vd.costo_usd_kg * v.tasa_cambio) AS costo
        $base GROUP BY v.fecha ORDER BY v.fecha");
    $st->execute($params);
    $diario = $st->fetchAll();

    // --- Semanal (según semana ISO) ---
    $st = $pdo->prepare("SELECT YEARWEEK(v.fecha, 1) AS semana, MIN(v.fecha) AS desde, MAX(v.fecha) AS hasta,
            SUM(vd.monto_bs) AS ventas,
            SUM(vd.cantidad_kg * vd.costo_usd_kg * v.tasa_cambio) AS costo
        $base GROUP BY YEARWEEK(v.fecha, 1) ORDER BY semana");
    $st->execute($params);
    $semanal = $st->fetchAll();

    // --- Por negocio (cliente) ---
    $st = $pdo->prepare("SELECT c.nombre_negocio,
            SUM(vd.monto_bs) AS ventas,
            SUM(vd.cantidad_kg * vd.costo_usd_kg * v.tasa_cambio) AS costo
        $base GROUP BY c.id, c.nombre_negocio ORDER BY ventas DESC");
    $st->execute($params);
    $porNegocio = $st->fetchAll();

    // --- General ---
    $st = $pdo->prepare("SELECT COALESCE(SUM(vd.monto_bs),0) AS ventas,
            COALESCE(SUM(vd.cantidad_kg * vd.costo_usd_kg * v.tasa_cambio),0) AS costo $base");
    $st->execute($params);
    $general = $st->fetch();

    $tablaGanancia = function (array $filas, string $colPeriodo, bool $esSemana = false) {
        ?>
        <div class="table-wrap">
            <table>
                <thead><tr><th><?= $esSemana ? 'Semana' : 'Fecha' ?></th><th class="text-right">Ventas (Bs)</th><th class="text-right">Costo (Bs)</th><th class="text-right">Ganancia (Bs)</th></tr></thead>
                <tbody>
                    <?php foreach ($filas as $f): $g = margen((float)$f['ventas'], (float)$f['costo']); ?>
                        <tr>
                            <td>
                                <?php if ($esSemana): ?>
                                    <strong><?= (int)$f['semana'] ?></strong>
                                    <span class="small muted">(<?= fecha($f['desde']) ?> - <?= fecha($f['hasta']) ?>)</span>
                                <?php else: ?>
                                    <?= fecha($f['periodo']) ?>
                                <?php endif; ?>
                            </td>
                            <td class="text-right mono"><?= bs($f['ventas']) ?></td>
                            <td class="text-right mono"><?= bs($f['costo']) ?></td>
                            <td class="text-right mono"><strong><?= bs($g) ?></strong></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$filas): ?><tr><td colspan="4" class="text-center muted">Sin datos en el rango.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    };
    $gGeneral = margen((float)$general['ventas'], (float)$general['costo']);
    ?>
    <div class="metrics">
        <div class="metric"><div class="label">Ventas del rango</div><div class="value"><?= bs($general['ventas']) ?></div></div>
        <div class="metric"><div class="label">Costo del rango</div><div class="value"><?= bs($general['costo']) ?></div></div>
        <div class="metric verde"><div class="label">Ganancia general</div><div class="value"><?= bs($gGeneral) ?></div>
            <div class="hint"><?= (float)$general['ventas'] > 0 ? number_format($gGeneral / (float)$general['ventas'] * 100, 1) . '% de margen' : '' ?></div>
        </div>
    </div>

    <div class="card"><h2>Ganancias diarias</h2><?php $tablaGanancia($diario, 'periodo'); ?></div>
    <div class="card"><h2>Ganancias semanales</h2><?php $tablaGanancia($semanal, 'semana', true); ?></div>

    <div class="card">
        <h2>Ganancias por negocio (cliente)</h2>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Negocio</th><th class="text-right">Ventas (Bs)</th><th class="text-right">Costo (Bs)</th><th class="text-right">Ganancia (Bs)</th></tr></thead>
                <tbody>
                    <?php foreach ($porNegocio as $f): $g = margen((float)$f['ventas'], (float)$f['costo']); ?>
                        <tr>
                            <td><strong><?= e($f['nombre_negocio']) ?></strong></td>
                            <td class="text-right mono"><?= bs($f['ventas']) ?></td>
                            <td class="text-right mono"><?= bs($f['costo']) ?></td>
                            <td class="text-right mono"><strong><?= bs($g) ?></strong></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$porNegocio): ?><tr><td colspan="4" class="text-center muted">Sin datos en el rango.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
<?php
/* =========================================================================
 *  REPORTE 2 · Cuentas por cobrar semanal
 * ========================================================================= */
elseif ($r === 'cobrar'):
    // Totales generales de lo pendiente
    $tot = $pdo->query("SELECT COALESCE(SUM(total_bs),0) FROM ventas WHERE estado_pago='pendiente'")->fetchColumn();

    // Por semana de vencimiento
    $sem = $pdo->query("
        SELECT YEARWEEK(fecha_vencimiento,1) AS semana,
               MIN(fecha_vencimiento) AS desde, MAX(fecha_vencimiento) AS hasta,
               COUNT(*) AS cantidad, SUM(total_bs) AS total
        FROM ventas WHERE estado_pago='pendiente'
        GROUP BY YEARWEEK(fecha_vencimiento,1) ORDER BY semana")->fetchAll();

    // Detalle por cliente
    $cli = $pdo->query("
        SELECT c.nombre_negocio, COUNT(*) AS cantidad, SUM(v.total_bs) AS total,
               SUM(CASE WHEN v.fecha_vencimiento < CURDATE() THEN v.total_bs ELSE 0 END) AS vencido
        FROM ventas v JOIN clientes c ON c.id=v.cliente_id
        WHERE v.estado_pago='pendiente'
        GROUP BY c.id, c.nombre_negocio ORDER BY total DESC")->fetchAll();

    // Listado de facturas pendientes
    $fac = $pdo->query("
        SELECT v.folio, c.nombre_negocio, v.fecha, v.fecha_vencimiento, v.total_bs,
               DATEDIFF(v.fecha_vencimiento, CURDATE()) AS dias
        FROM ventas v JOIN clientes c ON c.id=v.cliente_id
        WHERE v.estado_pago='pendiente' ORDER BY v.fecha_vencimiento")->fetchAll();
    ?>
    <div class="metrics">
        <div class="metric ambar"><div class="label">Total por cobrar</div><div class="value"><?= bs($tot) ?></div>
            <div class="hint"><?= count($fac) ?> factura(s) pendiente(s)</div></div>
    </div>

    <div class="card">
        <h2>Cuentas por cobrar por semana (vencimiento)</h2>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Semana</th><th class="text-center">Facturas</th><th class="text-right">Monto (Bs)</th></tr></thead>
                <tbody>
                    <?php foreach ($sem as $s): ?>
                        <tr>
                            <td><strong><?= (int)$s['semana'] ?></strong> <span class="small muted">(<?= fecha($s['desde']) ?> - <?= fecha($s['hasta']) ?>)</span></td>
                            <td class="text-center"><?= (int)$s['cantidad'] ?></td>
                            <td class="text-right mono"><?= bs($s['total']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$sem): ?><tr><td colspan="3" class="text-center muted">No hay cuentas pendientes.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <div class="card">
        <h2>Resumen por cliente</h2>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Negocio</th><th class="text-center">Facturas</th><th class="text-right">Por cobrar (Bs)</th><th class="text-right">Vencido (Bs)</th></tr></thead>
                <tbody>
                    <?php foreach ($cli as $c): ?>
                        <tr>
                            <td><strong><?= e($c['nombre_negocio']) ?></strong></td>
                            <td class="text-center"><?= (int)$c['cantidad'] ?></td>
                            <td class="text-right mono"><?= bs($c['total']) ?></td>
                            <td class="text-right mono"><?= (float)$c['vencido'] > 0 ? '<span class="tag tag-venc">' . bs($c['vencido']) . '</span>' : bs(0) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$cli): ?><tr><td colspan="4" class="text-center muted">Sin cuentas pendientes.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <div class="card">
        <h2>Facturas pendientes</h2>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Folio</th><th>Cliente</th><th>Emitida</th><th>Vence</th><th class="text-center">Estado</th><th class="text-right">Monto (Bs)</th></tr></thead>
                <tbody>
                    <?php foreach ($fac as $f): $d = (int)$f['dias']; ?>
                        <tr>
                            <td class="mono"><?= e($f['folio']) ?></td>
                            <td><?= e($f['nombre_negocio']) ?></td>
                            <td><?= fecha($f['fecha']) ?></td>
                            <td><?= fecha($f['fecha_vencimiento']) ?></td>
                            <td class="text-center">
                                <?php if ($d < 0): ?><span class="tag tag-venc">Vencida (<?= abs($d) ?>d)</span>
                                <?php elseif ($d <= 2): ?><span class="tag tag-pend"><?= $d ?>d</span>
                                <?php else: ?><span class="tag tag-on"><?= $d ?>d</span><?php endif; ?>
                            </td>
                            <td class="text-right mono"><?= bs($f['total_bs']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$fac): ?><tr><td colspan="6" class="text-center muted">Sin facturas pendientes.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
<?php
/* =========================================================================
 *  REPORTE 3 · Inventario por tipo de café (adicional)
 * ========================================================================= */
elseif ($r === 'inventario'):
    $sql = "
      SELECT tc.id, tc.nombre,
        COALESCE((SELECT SUM(cd.cantidad_kg) FROM compra_detalle cd WHERE cd.tipo_cafe_id=tc.id),0) AS comprado,
        COALESCE((SELECT SUM(cd.monto_usd)  FROM compra_detalle cd WHERE cd.tipo_cafe_id=tc.id),0) AS comprado_usd,
        COALESCE((SELECT SUM(vd.cantidad_kg) FROM venta_detalle vd JOIN ventas v ON v.id=vd.venta_id AND v.estado_pago<>'anulada' WHERE vd.tipo_cafe_id=tc.id),0) AS vendido,
        COALESCE((SELECT SUM(vd.monto_bs)   FROM venta_detalle vd JOIN ventas v ON v.id=vd.venta_id AND v.estado_pago<>'anulada' WHERE vd.tipo_cafe_id=tc.id),0) AS vendido_bs
      FROM tipos_cafe tc WHERE tc.activo=1 ORDER BY tc.id";
    $inv = $pdo->query($sql)->fetchAll();

    $totComprado=0; $totVendido=0; $totStock=0; $totValor=0;
    foreach ($inv as &$i) {
        $i['stock'] = (float)$i['comprado'] - (float)$i['vendido'];
        $i['costo_prom'] = (float)$i['comprado'] > 0 ? (float)$i['comprado_usd'] / (float)$i['comprado'] : 0;
        $i['valor'] = $i['stock'] * $i['costo_prom'];
        $totComprado += (float)$i['comprado']; $totVendido += (float)$i['vendido'];
        $totStock += $i['stock']; $totValor += $i['valor'];
    }
    unset($i);
    ?>
    <div class="metrics">
        <div class="metric"><div class="label">Total comprado</div><div class="value"><?= kg($totComprado) ?></div></div>
        <div class="metric"><div class="label">Total vendido</div><div class="value"><?= kg($totVendido) ?></div></div>
        <div class="metric verde"><div class="label">Stock disponible</div><div class="value"><?= kg($totStock) ?></div></div>
        <div class="metric ambar"><div class="label">Valor del inventario</div><div class="value"><?= usd($totValor) ?></div>
            <div class="hint">A costo promedio</div></div>
    </div>
    <div class="card">
        <h2>Inventario por tipo de café</h2>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Tipo</th><th class="text-right">Comprado</th><th class="text-right">Vendido</th><th class="text-right">Stock</th><th class="text-right">Costo prom. $/kg</th><th class="text-right">Valor $</th></tr></thead>
                <tbody>
                    <?php foreach ($inv as $i): ?>
                        <tr>
                            <td><strong><?= e($i['nombre']) ?></strong></td>
                            <td class="text-right mono"><?= kg($i['comprado']) ?></td>
                            <td class="text-right mono"><?= kg($i['vendido']) ?></td>
                            <td class="text-right mono"><strong><?= kg($i['stock']) ?></strong></td>
                            <td class="text-right mono"><?= usd($i['costo_prom']) ?></td>
                            <td class="text-right mono"><?= usd($i['valor']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
                <tfoot>
                    <tr>
                        <th>Total</th>
                        <th class="text-right mono"><?= kg($totComprado) ?></th>
                        <th class="text-right mono"><?= kg($totVendido) ?></th>
                        <th class="text-right mono"><?= kg($totStock) ?></th>
                        <th></th>
                        <th class="text-right mono"><?= usd($totValor) ?></th>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
<?php
/* =========================================================================
 *  REPORTE 4 · Compras por proveedor (adicional)
 * ========================================================================= */
elseif ($r === 'compras'):
    $st = $pdo->prepare("
        SELECT p.nombre_negocio, p.rif,
               COUNT(DISTINCT c.id) AS compras,
               COALESCE(SUM(cd.cantidad_kg),0) AS kg,
               COALESCE(SUM(cd.monto_usd),0) AS usd
        FROM compras c
        JOIN proveedores p ON p.id = c.proveedor_id
        JOIN compra_detalle cd ON cd.compra_id = c.id
        WHERE c.fecha BETWEEN ? AND ?
        GROUP BY p.id, p.nombre_negocio, p.rif
        ORDER BY usd DESC");
    $st->execute([$desde, $hasta]);
    $prov = $st->fetchAll();

    $totUsd = 0; $totKg = 0; $totCompras = 0;
    foreach ($prov as $p) { $totUsd += (float)$p['usd']; $totKg += (float)$p['kg']; $totCompras += (int)$p['compras']; }
    ?>
    <div class="metrics">
        <div class="metric"><div class="label">Total comprado</div><div class="value"><?= usd($totUsd) ?></div>
            <div class="hint"><?= $totCompras ?> compra(s) · <?= kg($totKg) ?></div></div>
    </div>
    <div class="card">
        <h2>Compras por proveedor</h2>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Proveedor</th><th>RIF</th><th class="text-center">Compras</th><th class="text-right">Kg</th><th class="text-right">Monto USD</th></tr></thead>
                <tbody>
                    <?php foreach ($prov as $p): ?>
                        <tr>
                            <td><strong><?= e($p['nombre_negocio']) ?></strong></td>
                            <td class="mono"><?= e($p['rif']) ?></td>
                            <td class="text-center"><?= (int)$p['compras'] ?></td>
                            <td class="text-right mono"><?= kg($p['kg']) ?></td>
                            <td class="text-right mono"><?= usd($p['usd']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    <?php if (!$prov): ?><tr><td colspan="5" class="text-center muted">Sin compras en el rango.</td></tr><?php endif; ?>
                </tbody>
                <tfoot><tr><th colspan="3">Total</th><th class="text-right mono"><?= kg($totKg) ?></th><th class="text-right mono"><?= usd($totUsd) ?></th></tr></tfoot>
            </table>
        </div>
    </div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
