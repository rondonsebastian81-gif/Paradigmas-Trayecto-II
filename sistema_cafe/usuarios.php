<?php
/**
 * Gestión de usuarios del sistema (solo administradores).
 */
$PAGE = 'usuarios';
require_once __DIR__ . '/includes/header.php';
require_admin();

$pdo = db();
$errores = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $accion = $_POST['accion'] ?? '';

    if ($accion === 'crear') {
        $nombre  = trim($_POST['nombre'] ?? '');
        $usuario = trim($_POST['usuario'] ?? '');
        $clave   = $_POST['clave'] ?? '';
        $rol     = ($_POST['rol'] ?? 'vendedor') === 'admin' ? 'admin' : 'vendedor';

        if ($nombre === '')                  $errores[] = 'El nombre es obligatorio.';
        if (!preg_match('/^[a-zA-Z0-9._-]{3,60}$/', $usuario)) $errores[] = 'El usuario debe tener 3-60 caracteres (letras, números, . _ -).';
        if (strlen($clave) < 6)              $errores[] = 'La contraseña debe tener al menos 6 caracteres.';

        if (!$errores) {
            try {
                $st = $pdo->prepare('INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)');
                $st->execute([$nombre, $usuario, password_hash($clave, PASSWORD_DEFAULT), $rol]);
                flash('Usuario "' . $usuario . '" creado.');
                redirect('usuarios.php');
            } catch (PDOException $ex) {
                if ($ex->getCode() === '23000') $errores[] = 'Ese nombre de usuario ya existe.';
                else throw $ex;
            }
        }
    }

    if ($accion === 'clave') {
        $id    = (int)($_POST['id'] ?? 0);
        $clave = $_POST['clave'] ?? '';
        if (strlen($clave) < 6) {
            $errores[] = 'La nueva contraseña debe tener al menos 6 caracteres.';
        } else {
            $st = $pdo->prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?');
            $st->execute([password_hash($clave, PASSWORD_DEFAULT), $id]);
            flash('Contraseña actualizada.');
            redirect('usuarios.php');
        }
    }

    if ($accion === 'toggle') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id === (int)$user['id']) {
            flash('No puedes desactivar tu propio usuario.', 'error');
        } else {
            $pdo->prepare('UPDATE usuarios SET activo = 1 - activo WHERE id = ?')->execute([$id]);
            flash('Estado del usuario actualizado.');
        }
        redirect('usuarios.php');
    }
}

$usuarios = $pdo->query('SELECT * FROM usuarios ORDER BY activo DESC, nombre ASC')->fetchAll();
?>
<div class="page-head">
    <div>
        <h1>Gestión de Usuarios</h1>
        <p class="sub">Control de acceso al sistema</p>
    </div>
    <button class="btn btn-primary" onclick="abrirModal('modalCrear')">➕ Nuevo usuario</button>
</div>

<?php foreach ($errores as $err): ?>
    <div class="alert alert-error"><?= e($err) ?></div>
<?php endforeach; ?>

<div class="card">
    <div class="table-wrap">
        <table>
            <thead><tr><th>Nombre</th><th>Usuario</th><th class="text-center">Rol</th><th class="text-center">Estado</th><th class="text-center">Acciones</th></tr></thead>
            <tbody>
                <?php foreach ($usuarios as $u): ?>
                    <tr class="<?= $u['activo'] ? '' : 'inactivo' ?>">
                        <td><strong><?= e($u['nombre']) ?></strong></td>
                        <td class="mono"><?= e($u['usuario']) ?></td>
                        <td class="text-center"><?= $u['rol'] === 'admin' ? '<span class="tag tag-pend">admin</span>' : '<span class="tag tag-on">vendedor</span>' ?></td>
                        <td class="text-center"><?= $u['activo'] ? '<span class="tag tag-on">Activo</span>' : '<span class="tag tag-off">Inactivo</span>' ?></td>
                        <td class="text-center">
                            <div class="row" style="justify-content:center;gap:6px">
                                <button class="btn btn-sm" onclick="abrirClave(<?= (int)$u['id'] ?>, '<?= e($u['usuario']) ?>')">🔑 Clave</button>
                                <?php if ((int)$u['id'] !== (int)$user['id']): ?>
                                    <form method="post" data-confirm="¿Cambiar el estado de este usuario?">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="accion" value="toggle">
                                        <input type="hidden" name="id" value="<?= (int)$u['id'] ?>">
                                        <button class="btn btn-sm <?= $u['activo'] ? 'btn-danger' : 'btn-success' ?>"><?= $u['activo'] ? 'Desactivar' : 'Reactivar' ?></button>
                                    </form>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Modal crear -->
<div class="modal-backdrop" id="modalCrear">
    <div class="modal">
        <button class="close" onclick="cerrarModal('modalCrear')">✕</button>
        <h2>Nuevo usuario</h2>
        <form method="post" data-validar novalidate>
            <?= csrf_field() ?>
            <input type="hidden" name="accion" value="crear">
            <div class="form-grid">
                <div class="field">
                    <label>Nombre completo <span class="req">*</span></label>
                    <input type="text" name="nombre" required maxlength="120">
                    <span class="error-msg">Obligatorio.</span>
                </div>
                <div class="field">
                    <label>Usuario <span class="req">*</span></label>
                    <input type="text" name="usuario" required minlength="3" maxlength="60" placeholder="usuario.login">
                    <span class="error-msg">Mínimo 3 caracteres.</span>
                </div>
                <div class="field">
                    <label>Contraseña <span class="req">*</span></label>
                    <input type="password" name="clave" required minlength="6" autocomplete="new-password">
                    <span class="error-msg">Mínimo 6 caracteres.</span>
                </div>
                <div class="field">
                    <label>Rol <span class="req">*</span></label>
                    <select name="rol" required>
                        <option value="vendedor">Vendedor</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Crear usuario</button>
                <button type="button" class="btn" onclick="cerrarModal('modalCrear')">Cancelar</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal clave -->
<div class="modal-backdrop" id="modalClave">
    <div class="modal">
        <button class="close" onclick="cerrarModal('modalClave')">✕</button>
        <h2>Cambiar contraseña: <span id="claveUsuario"></span></h2>
        <form method="post" data-validar novalidate>
            <?= csrf_field() ?>
            <input type="hidden" name="accion" value="clave">
            <input type="hidden" name="id" id="claveId">
            <div class="field">
                <label>Nueva contraseña <span class="req">*</span></label>
                <input type="password" name="clave" required minlength="6" autocomplete="new-password">
                <span class="error-msg">Mínimo 6 caracteres.</span>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Guardar</button>
                <button type="button" class="btn" onclick="cerrarModal('modalClave')">Cancelar</button>
            </div>
        </form>
    </div>
</div>

<script>
function abrirClave(id, usuario) {
    document.getElementById('claveId').value = id;
    document.getElementById('claveUsuario').textContent = usuario;
    abrirModal('modalClave');
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
