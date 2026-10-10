# Guía de Instalación y Ejecución en XAMPP (htdocs)

Este proyecto ha sido optimizado y depurado para ejecutarse sin problemas en el servidor Apache de **XAMPP**, ya sea en la raíz de `htdocs` o en cualquier subcarpeta (ej: `htdocs/invbulto/`).

---

## 🛠️ ¿Qué se ha configurado para XAMPP?
1. **Rutas Relativas (`base: './'` en `vite.config.ts`):**
   - Todos los scripts, hojas de estilo CSS e iconos ahora se cargan con rutas relativas (`./assets/...`).
   - Esto evita errores 404 de pantalla blanca al colocar la aplicación dentro de una subcarpeta como `http://localhost/invbulto/`.
2. **Archivo `.htaccess` para Apache:**
   - Habilita `mod_rewrite` para redireccionar rutas al `index.html` (soporte SPA sin errores 404 al recargar).
   - Configura tipos MIME correctos (`.js`, `.mjs`, `.css`, `.json`, `.svg`).
   - Habilita compresión GZIP para alta velocidad en servidor local.
3. **Puente PHP (`index.php` y `api/db.php`):**
   - Si se copia la carpeta del proyecto a `htdocs`, Apache detecta `index.php` y sirve automáticamente el sistema compilado.
   - `api/db.php` permite conectarse directamente al motor MySQL de XAMPP.
4. **Script SQL para phpMyAdmin (`database.sql`):**
   - Listo para importar en `http://localhost/phpmyadmin/`.
   - Crea la base de datos `invbulto_db` y el usuario estándar `admin` con contraseña `admin`.

---

## 🚀 Pasos para Ejecutar en XAMPP

### Opción A (Recomendada: Despliegue de Producción Compilado)

1. **Compilar el proyecto:**
   En la terminal del proyecto, ejecute:
   ```bash
   npm run build
   ```
   Esto generará la carpeta `dist/` con todo el código empaquetado, optimizado y con rutas relativas.

2. **Copiar a la carpeta `htdocs` de XAMPP:**
   - Abra el explorador de archivos y vaya a:
     `C:\xampp\htdocs\`
   - Cree una carpeta para el sistema, por ejemplo:
     `C:\xampp\htdocs\invbulto\`
   - Copie **todo el contenido que está dentro de la carpeta `dist/`** (incluyendo la carpeta `assets/`, el archivo `index.html` y `.htaccess`) dentro de `C:\xampp\htdocs\invbulto\`.

3. **Iniciar Apache y MySQL en XAMPP:**
   - Abra el **Panel de Control de XAMPP**.
   - Haga clic en el botón **Start** junto a **Apache** (debe ponerse verde).
   - Haga clic en el botón **Start** junto a **MySQL** (debe ponerse verde).

4. **Importar la Base de Datos (Opcional si usa el asistente web):**
   - Ingrese a: `http://localhost/phpmyadmin/`
   - Vaya a la pestaña **Importar**.
   - Seleccione el archivo `database.sql` incluido en el proyecto y pulse **Importar**.

5. **Abrir en su navegador:**
   - Abra Chrome, Edge o Firefox y visite:
     `http://localhost/invbulto/`
   - Inicie sesión con:
     - **Usuario:** `admin`
     - **Contraseña:** `admin`

---

### Opción B (Copiar la carpeta completa del proyecto)
Si copió la carpeta completa del proyecto a `C:\xampp\htdocs\invbulto\`:
- Asegúrese de haber ejecutado previamente `npm run build` para que exista la carpeta `dist/`.
- Al acceder a `http://localhost/invbulto/`, el archivo `index.php` detectará automáticamente `dist/` y mostrará la aplicación.

---

## ⚙️ Conexión MySQL en el Asistente de Inicio de Sesión
Si en la pantalla de inicio de sesión el sistema muestra el botón en la esquina **"Configurar Base de Datos"**:
1. Haga clic en el botón de la esquina superior derecha.
2. Haga clic en el botón verde **"⚡ Cargar Configuración XAMPP"**.
   - Servidor: `127.0.0.1` o `localhost`
   - Puerto: `3306`
   - Base de datos: `invbulto_db`
   - Usuario: `root`
   - Contraseña: `(vacía)`
3. Pulse **"Conectar y Crear Base de Datos"**.
4. ¡Listo! El botón de la esquina desaparecerá automáticamente y el usuario `admin` quedará listo para ingresar.
