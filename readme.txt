================================================================================
           INVBULTO POS & ERP MAYORISTA - GUÍA COMPLETA DE INSTALACIÓN
================================================================================
Sistema de Control de Inventario por Bulto y Detal, Punto de Venta (POS)
con Cobro Mixto/Múltiple, Facturación Dual ($ USD y Moneda Local) y MySQL.
================================================================================

TABLA DE CONTENIDOS:
-------------------
1. Requisitos Previos del Sistema
2. Método 1: Instalación Rápida con XAMPP (Recomendada para Comercios y Red Local)
3. Método 2: Instalación con Node.js / NPM (Modo Desarrollo o Compilación)
4. Método 3: Instalación en Servidor Web / Hosting Compartido (cPanel / Apache)
5. Método 4: Ejecución con Servidor PHP Integrado (Sin XAMPP)
6. Usuario y Credenciales Predeterminadas
7. Diagnóstico y Solución de Problemas Frecuentes

================================================================================
1. REQUISITOS PREVIOS DEL SISTEMA
================================================================================

Para ejecutar la aplicación se necesita alguno de los siguientes entornos:

* Para Modo Servidor Local / Producción:
  - XAMPP, WampServer o Laragon (con Apache 2.4+ y MySQL 5.7+ / MariaDB 10.4+ y PHP 7.4/8.x).
  - Cualquier navegador moderno (Google Chrome, Microsoft Edge, Mozilla Firefox).

* Para Modo Desarrollo (Compilación desde código fuente):
  - Node.js versión 18.0.0 o superior (https://nodejs.org/).
  - NPM versión 9 o superior.

================================================================================
2. MÉTODO 1: INSTALACIÓN RÁPIDA CON XAMPP (RECOMENDADA)
================================================================================

Este método permite usar el sistema en su computadora local o compartirlo en
la red local de su negocio con otras computadoras, cajas o teléfonos.

PASO 1: Descargar e Instalar XAMPP
---------------------------------
1. Si aún no tiene XAMPP, descárguelo gratis desde: https://www.apachefriends.org/
2. Instálelo en la ruta predeterminada (en Windows: C:\xampp).

PASO 2: Colocar el Proyecto en htdocs
------------------------------------
1. Abra el Explorador de Archivos de Windows.
2. Vaya a la carpeta:
   C:\xampp\htdocs\
3. Cree una carpeta con el nombre que prefiera para el sistema, por ejemplo:
   C:\xampp\htdocs\invbulto\
4. Copie los archivos del sistema dentro de esa carpeta.
   * Si ya tiene la carpeta compilada "dist":
     Copie el contenido de "dist" junto con la carpeta "public/api" y "database.sql"
     dentro de C:\xampp\htdocs\invbulto\
   * Si tiene el proyecto completo con Node.js:
     Abra una consola en la carpeta del proyecto, ejecute:
     npm run build
     Y copie el contenido generado en "dist" a C:\xampp\htdocs\invbulto\

PASO 3: Iniciar los Servicios en XAMPP
-------------------------------------
1. Abra el "Panel de Control de XAMPP" (XAMPP Control Panel).
2. En la fila de "Apache", haga clic en el botón "Start" (debe ponerse en color verde).
3. En la fila de "MySQL", haga clic en el botón "Start" (debe ponerse en color verde).

PASO 4: Inicializar la Base de Datos MySQL
-----------------------------------------
Tiene dos alternativas para crear las tablas:

* Opción A (Automática mediante el Asistente del Sistema):
  1. Abra su navegador web y visite: http://localhost/invbulto/
  2. En la pantalla de inicio de sesión, haga clic en el botón superior:
     "Configurar Base de Datos".
  3. Haga clic en el botón verde: "⚡ Cargar Configuración XAMPP".
     - Servidor / Host: 127.0.0.1
     - Puerto: 3306
     - Base de Datos: invbulto_db
     - Usuario: root
     - Contraseña: (dejar vacía en XAMPP estándar)
  4. Haga clic en el botón: "Conectar y Crear Base de Datos".
  5. El sistema conectará con MySQL, creará automáticamente las 11 tablas
     normalizadas y registrará el usuario administrador.

* Opción B (Manual con phpMyAdmin):
  1. En su navegador abra: http://localhost/phpmyadmin/
  2. Haga clic en la pestaña "Importar" (Import).
  3. Haga clic en "Seleccionar archivo" y elija el archivo:
     C:\xampp\htdocs\invbulto\database.sql  (o public/database.sql)
  4. Baje hasta el final y haga clic en "Importar" (Continuar / Go).
  5. Se creará la base de datos "invbulto_db" con sus 11 tablas y el usuario admin.

PASO 5: Iniciar Sesión en el Sistema
-----------------------------------
1. Ingrese a: http://localhost/invbulto/
2. Inicie sesión con:
   - Usuario: admin
   - Contraseña: admin

================================================================================
3. MÉTODO 2: INSTALACIÓN CON NODE.JS / NPM (MODO DESARROLLO)
================================================================================

Si es desarrollador o desea modificar el código fuente en tiempo real:

PASO 1: Descargar dependencias
------------------------------
Abra la terminal (PowerShell, CMD, Bash o Terminal de VS Code) en la carpeta raíz
del proyecto y ejecute:

   npm install

PASO 2: Iniciar Servidor de Desarrollo
--------------------------------------
En la terminal ejecute:

   npm run dev

El sistema iniciará el servidor de desarrollo Vite y le mostrará un enlace local:
   http://localhost:3000/  (o http://localhost:5173/)

PASO 3: Compilar para Producción
--------------------------------
Cuando termine de hacer cambios y desee generar los archivos finales listos para
cualquier servidor web, ejecute:

   npm run build

Los archivos optimizados y empaquetados se guardarán dentro de la carpeta "dist/".

================================================================================
4. MÉTODO 3: INSTALACIÓN EN HOSTING COMPARTIDO (cPanel / Apache)
================================================================================

Para instalar el sistema en un hosting de internet con cPanel:

1. Ejecute en su computadora local:
   npm run build

2. Inicie sesión en su cPanel y cree una base de datos MySQL:
   - Vaya a "Bases de datos MySQL".
   - Cree una base de datos, por ejemplo: "miempresa_invbulto".
   - Cree un usuario y contraseña, y asígnele todos los privilegios a la base de datos.
   - Abra "phpMyAdmin" en cPanel e importe el archivo "public/database.sql".

3. Subir los archivos:
   - Abra el "Administrador de Archivos" de cPanel.
   - Ingrese a la carpeta "public_html" (o una subcarpeta como public_html/sistema).
   - Suba y descomprima todo el contenido que está dentro de la carpeta "dist/".
   - Asegúrese de que el archivo ".htaccess" esté visible en la carpeta.

4. Configurar conexión en el sistema:
   - Ingrese a su dominio: https://tudominio.com/sistema/
   - En el asistente de "Configurar Base de Datos", coloque:
     Host: localhost
     Puerto: 3306
     Base de Datos: nombre_de_su_bd_en_cpanel
     Usuario: usuario_de_su_bd
     Contraseña: clave_de_su_bd
   - Haga clic en "Conectar y Crear Base de Datos".

================================================================================
5. MÉTODO 4: EJECUCIÓN CON SERVIDOR PHP INTEGRADO (SIN XAMPP)
================================================================================

Si tiene PHP instalado en su sistema operativo y no desea instalar XAMPP completo:

1. Asegúrese de tener MySQL activo en el puerto 3306.
2. Compile la aplicación con:
   npm run build
3. Inicie el servidor interno de PHP apuntando a la carpeta de distribución:
   php -S 127.0.0.1:8080 -t dist/
4. Abra su navegador en:
   http://127.0.0.1:8080/

================================================================================
6. USUARIO Y CREDENCIALES PREDETERMINADAS
================================================================================

Al instalar o conectar la base de datos por primera vez, el sistema genera
un usuario estándar con todos los privilegios de Administrador:

   - Rol: Administrador General (admin)
   - Nombre de Usuario: admin
   - Contraseña: admin

* RECOMENDACIÓN DE SEGURIDAD:
Una vez que ingrese por primera vez, vaya al módulo "Usuarios / RBAC" en el menú
lateral y cambie la contraseña por una segura para proteger la información del
negocio. También puede crear cajeros, gerentes y almacenistas con permisos
específicos.

================================================================================
7. DIAGNÓSTICO Y SOLUCIÓN DE PROBLEMAS FRECUENTES
================================================================================

Problema 1: "No se conectó a la base de datos MySQL" (Indicador en Rojo)
-----------------------------------------------------------------------
* Causa: El servicio MySQL en XAMPP está detenido o bloqueado por otro programa.
* Solución:
  1. Abra el Panel de Control de XAMPP y presione "Start" en MySQL.
  2. Si MySQL se cierra solo, verifique que otro programa (como Skype o MariaDB de
     otra instalación) no esté usando el puerto 3306.
  3. Verifique que el usuario "root" no tenga una contraseña distinta en su XAMPP.

Problema 2: "Señal de Error: No se generó una tabla requerida"
-------------------------------------------------------------
* Causa: La base de datos no tiene alguna de las 11 tablas del sistema.
* Solución:
  1. En la barra superior, haga clic en el botón de Diagnóstico (icono de base de datos / campana).
  2. Haga clic en el botón verde "Reparar / Generar Tablas".
  3. El sistema ejecutará automáticamente el script DDL y dejará las 11 tablas listas.

Problema 3: Pantalla en blanco al colocar el sistema en una subcarpeta de XAMPP
-------------------------------------------------------------------------------
* Causa: Rutas absolutas no compatibles con subcarpetas.
* Solución:
  Este proyecto ya cuenta con "base: './'" configurado en "vite.config.ts" y un
  archivo ".htaccess" optimizado. Solo asegúrese de haber generado la versión con
  "npm run build" y haber copiado el archivo ".htaccess".

Problema 4: Error 404 al recargar la página en el navegador
-----------------------------------------------------------
* Causa: El servidor Apache no tiene habilitado el módulo mod_rewrite.
* Solución:
  En XAMPP, abra "Config" junto a Apache -> "httpd.conf", busque la línea:
  #LoadModule rewrite_module modules/mod_rewrite.so
  Y quite el signo '#' al inicio para habilitarlo, luego reinicie Apache.

================================================================================
¡Listo! Su sistema InvBulto POS & ERP Mayorista está listo para trabajar.
================================================================================
