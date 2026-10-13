<?php
/**
 * MÓDULO 2 · Registro de Clientes (acreedores)
 * - Agregar (nombre del negocio, RIF y datos de contacto)
 * - Modificar: SOLO los datos de contacto
 * - Desactivar / reactivar negocio
 */
$PAGE = 'clientes';
require_once __DIR__ . '/includes/header.php';

$pdo = db();
$errores = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $accion = $_POST['accion'] ?? '';

    /* -------------------- CREAR -------------------- */
    if ($accion === 'crear') {
        $nombre = trim($_POST['nombre_negocio'] ?? '');
        $rif    = strtoupper(trim($_POST['rif'] ?? ''));
        $cn     = trim($_POST['contacto_nombre'] ?? '');
        $cc     = trim($_POST['contacto_cedula'] ?? '');
        $ct     = trim($_POST['contacto_telefono'] ?? '');
        $ce     = trim($_POST['contacto_email'] ?? '');

        if ($nombre === '')        $errores[] = 'El nombre del negocio es obligatorio.';
        if (!rif_valido($rif))     $errores[] = 'El RIF no es válido (ej: J-12345678-9).';
        if ($cn === '')            $errores[] = 'El nombre del contacto es obligatorio.';
        if (!cedula_valida($cc))   $errores[] = 'La cédula del contacto no es válida.';
        if (!telefono_valido($ct)) $errores[] = 'El teléfono no es válido.';
        if (!email_valido($ce))    $errores[] = 'El correo electrónico no es válido.';

        if (!$errores) {
            try {
                $st = $pdo->prepare('INSERT INTO clientes
                    (nombre_negocio, rif, contacto_nombre, contacto_cedula, contacto_telefono, contacto_email)
                    VALUES (?, ?, ?, ?, ?, ?)');
                $st->execute([$nombre, $rif, $cn, $cc, $ct, $ce]);
                flash('Cliente "' . $nombre . '" registrado correctamente.');
                redirect('clientes.php');
            } catch (PDOException $ex) {
                if ($ex->getCode() === '23000') $errores[] = 'Ya existe un cliente con ese RIF.';
                else throw $ex;
            }
        }
    }

    /* -------------------- EDITAR CONTACTO -------------------- */
    if ($accion === 'editar_contacto') {
        $id = (int)($_POST['id'] ?? 0);
        $cn = trim($_POST['contacto_nombre'] ?? '');
        $cc = trim($_POST['contacto_cedula'] ?? '');
        $ct = trim($_POST['contacto_telefono'] ?? '');
        $ce = trim($_POST['contacto_email'] ?? '');

        if ($cn === '')            $errores[] = 'El nombre del contacto es obligatorio.';
        if (!cedula_valida($cc))   $errores[] = 'La cédula del contacto no es válida.';
        if (!telefono_valido($ct)) $errores[] = 'El teléfono no es válido.';
        if (!email_valido($ce))    $errores[] = 'El correo electrónico no es válido.';

        if (!$errores) {
            $st = $pdo->prepare('UPDATE clientes
                SET contacto_nombre = ?, contacto_cedula = ?, contacto_telefono = ?, contacto_email = ?
                WHERE id = ?');
            $st->execute([$cn, $cc, $ct, $ce, $id]);
            flash('Datos de contacto actualizados.');
            redirect('clientes.php');
        }
    }

    /* -------------------- ACTIVAR / DESACTIVAR -------------------- */
    if ($accion === 'toggle') {
        $id = (int)($_POST['id'] ?? 0);
        $st = $pdo->prepare('UPDATE clientes SET activo = 1 - activo WHERE id = ?');
        $st->execute([$id]);
        flash('Estado del cliente actualizado.');
        redirect('clientes.php');
    }
}

$clientes = $pdo->query('SELECT * FROM clientes ORDER BY activo DESC, nombre_negocio ASC')->fetchAll();
?>
<div class="page-head">
    <div>
        <h1>Registro de Clientes</h1>
        <p class="sub">Venta de café con financiamiento · montos en bolívares</p>
    </div>
    <button class="btn btn-primary" onclick="abrirModal('modalCrear')">➕ Agregar cliente</button>
</div>

<?php foreach ($errores as $err): ?>
    <div class="alert alert-error"><?= e($err) ?></div>
<?php endforeach; ?>

<div class="card">
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Negocio</th><th>RIF</th><th>Contacto</th><th>Cédula</th>
                    <th>Teléfono</th><th>Correo</th><th class="text-center">Estado</th><th class="text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$clientes): ?>
                    <tr><td colspan="8" class="text-center muted">No hay clientes registrados.</td></tr>
                <?php endif; ?>
                <?php foreach ($clientes as $c): ?>
                    <tr class="<?= $c['activo'] ? '' : 'inactivo' ?>">
                        <td><strong><?= e($c['nombre_negocio']) ?></strong></td>
                        <td class="mono"><?= e($c['rif']) ?></td>
                        <td><?= e($c['contacto_nombre']) ?></td>
                        <td class="mono"><?= e($c['contacto_cedula']) ?></td>
                        <td class="mono"><?= e($c['contacto_telefono']) ?></td>
                        <td><?= e($c['contacto_email']) ?></td>
                        <td class="text-center">
                            <?= $c['activo'] ? '<span class="tag tag-on">Activo</span>' : '<span class="tag tag-off">Inactivo</span>' ?>
                        </td>
                        <td class="text-center">
                            <div class="row" style="justify-content:center;gap:6px">
                                <button class="btn btn-sm" onclick='abrirEditar(<?= json_encode([
                                    "id" => $c["id"],
                                    "nombre_negocio" => $c["nombre_negocio"],
                                    "rif" => $c["rif"],
                                    "contacto_nombre" => $c["contacto_nombre"],
                                    "contacto_cedula" => $c["contacto_cedula"],
                                    "contacto_telefono" => $c["contacto_telefono"],
                                    "contacto_email" => $c["contacto_email"],
                                ], JSON_HEX_APOS | JSON_HEX_QUOT) ?>)'>✏️ Contacto</button>
                                <form method="post" data-confirm="¿Confirmas cambiar el estado de este cliente?">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="accion" value="toggle">
                                    <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
                                    <button type="submit" class="btn btn-sm <?= $c['activo'] ? 'btn-danger' : 'btn-success' ?>">
                                        <?= $c['activo'] ? 'Desactivar' : 'Reactivar' ?>
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Modal Crear -->
<div class="modal-backdrop" id="modalCrear">
    <div class="modal">
        <button class="close" onclick="cerrarModal('modalCrear')">✕</button>
        <h2>Agregar cliente</h2>
        <form method="post" data-validar novalidate>
            <?= csrf_field() ?>
            <input type="hidden" name="accion" value="crear">
            <div class="form-grid">
                <div class="field">
                    <label>Nombre del negocio <span class="req">*</span></label>
                    <input type="text" name="nombre_negocio" required maxlength="150">
                    <span class="error-msg">Nombre obligatorio.</span>
                </div>
                <div class="field">
                    <label>RIF del negocio <span class="req">*</span></label>
                    <input type="text" name="rif" required data-validate="rif" placeholder="J-12345678-9">
                    <span class="error-msg">RIF inválido (ej: J-12345678-9).</span>
                </div>
            </div>
            <h2 class="mt-2">Datos de contacto</h2>
            <div class="form-grid">
                <div class="field">
                    <label>Nombre <span class="req">*</span></label>
                    <input type="text" name="contacto_nombre" required maxlength="120">
                    <span class="error-msg">Obligatorio.</span>
                </div>
                <div class="field">
                    <label>Cédula <span class="req">*</span></label>
                    <input type="text" name="contacto_cedula" required data-validate="cedula" placeholder="12345678">
                    <span class="error-msg">Cédula inválida.</span>
                </div>
                <div class="field">
                    <label>Teléfono <span class="req">*</span></label>
                    <input type="text" name="contacto_telefono" required data-validate="telefono" placeholder="0414-1234567">
                    <span class="error-msg">Teléfono inválido.</span>
                </div>
                <div class="field">
                    <label>Correo electrónico <span class="req">*</span></label>
                    <input type="email" name="contacto_email" required data-validate="email" placeholder="correo@dominio.com">
                    <span class="error-msg">Correo inválido.</span>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Guardar cliente</button>
                <button type="button" class="btn" onclick="cerrarModal('modalCrear')">Cancelar</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal Editar contacto -->
<div class="modal-backdrop" id="modalEditar">
    <div class="modal">
        <button class="close" onclick="cerrarModal('modalEditar')">✕</button>
        <h2>Modificar datos de contacto</h2>
        <form method="post" data-validar novalidate>
            <?= csrf_field() ?>
            <input type="hidden" name="accion" value="editar_contacto">
            <input type="hidden" name="id" id="ed_id">
            <div class="form-grid">
                <div class="field">
                    <label>Nombre del negocio (no editable)</label>
                    <input type="text" id="ed_negocio" readonly>
                </div>
                <div class="field">
                    <label>RIF (no editable)</label>
                    <input type="text" id="ed_rif" readonly>
                </div>
            </div>
            <h2 class="mt-2">Datos de contacto</h2>
            <div class="form-grid">
                <div class="field">
                    <label>Nombre <span class="req">*</span></label>
                    <input type="text" name="contacto_nombre" id="ed_cn" required maxlength="120">
                    <span class="error-msg">Obligatorio.</span>
                </div>
                <div class="field">
                    <label>Cédula <span class="req">*</span></label>
                    <input type="text" name="contacto_cedula" id="ed_cc" required data-validate="cedula">
                    <span class="error-msg">Cédula inválida.</span>
                </div>
                <div class="field">
                    <label>Teléfono <span class="req">*</span></label>
                    <input type="text" name="contacto_telefono" id="ed_ct" required data-validate="telefono">
                    <span class="error-msg">Teléfono inválido.</span>
                </div>
                <div class="field">
                    <label>Correo electrónico <span class="req">*</span></label>
                    <input type="email" name="contacto_email" id="ed_ce" required data-validate="email">
                    <span class="error-msg">Correo inválido.</span>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Actualizar contacto</button>
                <button type="button" class="btn" onclick="cerrarModal('modalEditar')">Cancelar</button>
            </div>
        </form>
    </div>
</div>

<script>
function abrirEditar(d) {
    document.getElementById('ed_id').value = d.id;
    document.getElementById('ed_negocio').value = d.nombre_negocio;
    document.getElementById('ed_rif').value = d.rif;
    document.getElementById('ed_cn').value = d.contacto_nombre;
    document.getElementById('ed_cc').value = d.contacto_cedula;
    document.getElementById('ed_ct').value = d.contacto_telefono;
    document.getElementById('ed_ce').value = d.contacto_email;
    abrirModal('modalEditar');
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
