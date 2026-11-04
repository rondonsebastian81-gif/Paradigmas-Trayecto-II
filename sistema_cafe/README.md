# ☕ Café Control — Sistema de compra y venta de café

Sistema web en **PHP + MySQL** para gestionar proveedores, clientes, compras, ventas y reportes.
Se ejecuta **localmente con XAMPP**: cada persona que lo descargue tiene su propia copia y su propia base de datos.

> ⚠️ **No funciona en GitHub Pages.** GitHub solo aloja archivos estáticos (HTML/CSS/JS); no ejecuta PHP ni MySQL.

---

## Requisitos

- **XAMPP** instalado (incluye Apache, MySQL/MariaDB y PHP).
- Un navegador (Chrome, Edge, Firefox…).
- Windows, macOS o Linux.

---

## Instalación (5 minutos)

1. **Instala XAMPP** desde <https://www.apachefriends.org>.
2. Abre el **XAMPP Control Panel** y pulsa **Start** en **Apache** y en **MySQL**.
   Ambos deben quedar en **verde**.
3. **Copia la carpeta `sistema_cafe`** dentro de `htdocs`:
   - En Windows: `C:\xampp\htdocs\sistema_cafe`
   - Debe quedar así: `C:\xampp\htdocs\sistema_cafe\index.php`
4. Abre en el navegador **una sola vez**:
   `http://localhost/sistema_cafe/instalar.php`
   Esto crea la base de datos, las tablas, los datos iniciales y el usuario administrador.
5. Abre el sistema:
   **`http://localhost/sistema_cafe/`**

### Credenciales por defecto

| Usuario | Contraseña |
|---------|-----------|
| `admin` | `admin123` |

> Cámbiala luego desde el módulo **Usuarios**.

---

## ¿Qué crea el instalador?

- Base de datos `cafe_db`.
- Todas las tablas (usuarios, proveedores, clientes, compras, ventas, reportes, etc.).
- Tipos de café: **Suave**, **Normal** y **Fuerte**.
- Tasa de cambio inicial: **Bs 36,50 / $** (editable desde Configuración).
- Usuario administrador `admin / admin123`.

El instalador es **seguro de volver a ejecutar**: no borra datos existentes.

---

## Conexión a la base de datos

Los valores por defecto de XAMPP están en `config/config.php`:

| Parámetro | Valor |
|-----------|-------|
| Host | `127.0.0.1` |
| Puerto | `3306` |
| Base de datos | `cafe_db` |
| Usuario | `root` |
| Contraseña | *(vacía)* |

Si tu MySQL tiene contraseña, edita `config/config.php` y colócala en `DB_PASS`.

---

## Módulos del sistema

- **Proveedores:** alta, edición de contacto y desactivación.
- **Clientes:** alta, edición de contacto y desactivación.
- **Compras:** registro de compras por tipo de café (kg y precio en USD).
- **Ventas:** registro de ventas en Bs con financing hasta 7 días.
- **Reportes:** ganancias diarias/semanales por negocio y general, cuentas por cobrar, inventario y compras.
- **Usuarios y Configuración:** gestión de accesos y tasa de cambio.

---

## Problemas comunes

| Problema | Solución |
|----------|----------|
| Apache no inicia | El puerto 80 está ocupado. Cambia Apache a 8080 o cierra el programa que lo usa. |
| MySQL no inicia | El puerto 3306 está ocupado por otro MySQL. |
| "Acceso denegado para el usuario root" | Revisa `DB_PASS` en `config/config.php`. |
| La página se ve en blanco o muestra código PHP | Abre por `http://localhost/...` con Apache encendido (no con doble clic). |
| Error 404 | Verifica que la carpeta esté dentro de `htdocs` y la URL bien escrita. |

---

## Notas

- Los datos **no se comparten** entre personas: cada instalación tiene su propia base local.
- No abras los archivos `.php` con doble clic (se abre el editor). Siempre por `http://localhost/`.
- Para acceso por internet se necesita un hosting con **PHP + MySQL** (no GitHub Pages).
