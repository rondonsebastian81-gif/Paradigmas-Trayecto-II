<?php
/**
 * Configuración del sistema: tasa de cambio Bs/$ (editable).
 * Solo administradores.
 */
$PAGE = 'config';
require_once __DIR__ . '/includes/header.php';
require_admin();

$pdo = db();
$mensaje = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $nueva = (float)str_replace(',', '.', $_POST['tasa_cambio'] ?? '0');
    if ($nueva <= 0) {
        $error = 'La tasa de cambio debe ser un número mayor a 0.';
    } else {
        config_set('tasa_cambio', number_format($nueva, 2, '.', ''));
        $mensaje = 'Tasa de cambio actualizada a Bs ' . number_format($nueva, 2, ',', '.') . ' / $.';
    }
}

$tasaActual = tasa_cambio();
$tipos = $pdo->query('SELECT * FROM tipos_cafe ORDER BY id')->fetchAll();
?>
<div class="page-head">
    <div>
        <h1>Configuración</h1>
        <p class="sub">Parámetros generales del sistema</p>
    </div>
</div>

<?php if ($mensaje): ?><div class="alert alert-success"><?= e($mensaje) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>

<div class="split">
    <div class="card">
        <h2>Tasa de cambio (Bs por dólar)</h2>
        <p class="small muted">Se usa para convertir los costos de compra (en dólares) y calcular las ganancias de las ventas (en bolívares).</p>
        <form method="post" data-validar novalidate>
            <?= csrf_field() ?>
            <div class="form-grid">
                <div class="field">
                    <label>Tasa actual (Bs/$) <span class="req">*</span></label>
                    <input type="number" name="tasa_cambio" required min="0.01" step="0.01" data-validate="positivo"
                           value="<?= number_format($tasaActual, 2, '.', '') ?>">
                    <span class="error-msg">Ingresa un valor mayor a 0.</span>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Guardar tasa</button>
            </div>
        </form>
    </div>

    <div class="card">
        <h2>Tipos de café</h2>
        <p class="small muted">Versiones de café manejadas por el sistema.</p>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Tipo</th><th class="text-center">Estado</th></tr></thead>
                <tbody>
                    <?php foreach ($tipos as $t): ?>
                        <tr>
                            <td><strong><?= e($t['nombre']) ?></strong></td>
                            <td class="text-center"><?= $t['activo'] ? '<span class="tag tag-on">Activo</span>' : '<span class="tag tag-off">Inactivo</span>' ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
