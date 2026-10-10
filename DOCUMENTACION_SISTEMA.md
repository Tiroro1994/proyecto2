# 📚 Documentación Técnica Integral - InvBulto POS & ERP Mayorista

Esta documentación describe la arquitectura completa del sistema, qué hace cada componente, módulo y archivo, así como su correlación e intercambio de datos.

---

## 🗺️ 1. Mapa de Correlación del Sistema

```
[ Navegador Web / Cliente ]
        │
        ├── 1. index.html / index.php (Punto de Entrada en XAMPP Apache)
        │
        ├── 2. src/main.tsx (Montaje de React 19)
        │
        ├── 3. src/context/AppContext.tsx (Estado Global React & Caché Local)
        │         ▲
        │         │  (Acciones: Login, Venta, Gasto, Producto, Compra)
        │         ▼
        ├── 4. src/services/databaseSync.ts (Servicio Conector Asíncrono)
        │         ▲
        │         │  (Peticiones HTTP Fetch / JSON)
        │         ▼
        ├── 5. public/api/db.php (API REST PHP en Apache)
        │         ▲
        │         │  (PDO / SQL con Transacciones Atómicas)
        │         ▼
        └── 6. MySQL Database: `invbulto_db` (Tablas Relacionales y Seeds)
```

---

## 📂 2. Desglose Módulo por Módulo y Archivo por Archivo

### A. Configuración y Entrada al Sistema

#### 1. `vite.config.ts`
- **Propósito:** Configura el empaquetador Vite y Tailwind CSS.
- **Líneas clave:**
  - `base: './'`: Hace que todas las rutas a los archivos compilados (`.js`, `.css`, imágenes) sean **relativas** y no absolutas.
  - **Correlación:** Es lo que permite que el proyecto se ejecute dentro de `C:\xampp\htdocs\tu-carpeta\` sin errores de pantalla blanca 404.

#### 2. `index.html`
- **Propósito:** Documento raíz HTML5.
- **Líneas clave:**
  - Contiene las etiquetas `<head>`, fuentes tipográficas (`Plus Jakarta Sans`, `JetBrains Mono`) y el elemento contenedor `<div id="root"></div>`.
  - En desarrollo carga `<script type="module" src="/src/main.tsx"></script>`.
  - Al compilar con `npm run build`, se transforma en `dist/index.html` con enlaces relativos a `./assets/`.

#### 3. `index.php` y `public/index.php`
- **Propósito:** Puente nativo para Apache en XAMPP.
- **Líneas clave:**
  - Detecta si existe `dist/index.html` y lo sirve de inmediato.
  - Corrige automáticamente la ruta base de assets según el directorio en el que se encuentre en `htdocs`.

#### 4. `.htaccess` y `public/.htaccess`
- **Propósito:** Configuración del servidor Apache.
- **Líneas clave:**
  - `RewriteEngine On`: Activa la reescritura de URL.
  - `RewriteCond %{REQUEST_FILENAME} -f [OR] -d`: Si el archivo existe físicamente (ej. una imagen o script), lo sirve directamente.
  - `RewriteRule ^ index.html [L]`: Si se recarga la página en cualquier ruta, la redirige a `index.html` para no dar error 404 (Soporte SPA).

---

### B. Tipos de Datos y Modelos (`src/types/index.ts`)

Define los contratos TypeScript que aseguran que todos los módulos hablen exactamente el mismo idioma:
- **`User` & `UserRole`:** Define usuarios con `id`, `name`, `username`, `email`, `password`, `role` (`admin`, `gerente`, `cajero`, `almacen`) y `active`.
- **`Product`:** Estructura de control dual: `unitsPerPackage` (unidades por bulto), `packageLabel` (Bulto, Caja, Fardo), `totalUnitsInStock` (fuente única de verdad del inventario en unidades), `costUnitUSD`, `costPackageUSD`, `priceUnitUSD`, `pricePackageUSD`.
- **`Expense`:** Registra los gastos operativos con `date` (Día), `description` (Razón), `category`, `amountUSD`, `amountLocal`, `paymentMethod` (Efectivo Divisas $ o Transferencia Bancaria), `reference` y `registeredBy`.
- **`Sale` & `CartItem`:** Modela facturas con ítems tanto en bultos como en unidades sueltas, con desglose de IVA, cálculo de ganancia neta y tasas bimonetarias.
- **`PurchaseInvoice` & `PurchaseItem`:** Modela compras a proveedores por bultos con cálculo automático de costo por unidad (`costPackageUSD / unitsPerPackage`).
- **`DatabaseConfig`:** Configura el motor de base de datos (`mysql`, `postgresql`, `mariadb`, `sqlite`), host, puerto, usuario y contraseña.

---

### C. Núcleo Reactivo del Sistema (`src/context/AppContext.tsx`)

Es el cerebro del frontend en React. Centraliza el estado, la lógica de negocio y la persistencia:

1. **Estado de Autenticación y Base de Datos:**
   - `isAuthenticated`: Booleano que determina si se muestra la pantalla de Login o el sistema completo.
   - `isDatabaseConnected`: Booleano persistido que indica si hay una base de datos configurada.
   - `isDbOnline`: Detecta si el servidor Apache/MySQL en XAMPP está respondiendo en vivo.

2. **Detección y Conexión de Base de Datos (`connectAndInitializeDatabase`):**
   - Recibe la configuración elegida por el usuario.
   - Registra `invbulto_db_connected = true`.
   - **Garantiza la creación del usuario estándar:** Verifica que exista el usuario `admin` con contraseña `admin` y rol `admin`.
   - Al conectarse, **hace desaparecer el botón de configuración de la esquina**.

3. **Mecanismo de Hidratación en Vivo (`useEffect`):**
   - Llama a `checkDatabaseLiveStatus()` y `fetchAllFromDatabase()`.
   - Si MySQL en XAMPP está activo, lee los productos, clientes, ventas y gastos reales de la base de datos y los inyecta en el estado de React.

4. **Operaciones Transaccionales Conectadas:**
   - **`processCheckout` (Punto de Venta):** Descuenta el stock, crea el movimiento de kardex, genera la factura y llama a `syncSaleToDatabase()`.
   - **`addExpense` / `deleteExpense` / `updateExpense`:** Registra el gasto en React y llama inmediatamente a `syncExpenseToDatabase()` o `deleteExpenseFromDatabase()`.
   - **`addProduct` / `updateProduct` / `deleteProduct`:** Mantiene el catálogo en React y lo replica en MySQL mediante `syncProductToDatabase()`.

---

### D. Servicio de Conexión a Base de Datos (`src/services/databaseSync.ts`)

Es el puente asíncrono entre React y el backend PHP:
- **`checkDatabaseLiveStatus()`:** Envía un ping HTTP a `./api/db.php?action=status` para verificar si Apache y MySQL están corriendo en XAMPP.
- **`fetchAllFromDatabase()`:** Llama a `./api/db.php?action=get_all` y obtiene la información en formato JSON.
- **`syncExpenseToDatabase(expense)`:** Envía el gasto a `./api/db.php?action=save_expense`.
- **`syncSaleToDatabase(sale)`:** Envía la factura a `./api/db.php?action=save_sale`.
- **`syncProductToDatabase(product)`:** Envía el producto a `./api/db.php?action=save_product`.
- **`deleteProductFromDatabase(id)`:** Solicita la baja del producto en `./api/db.php?action=delete_product`.

---

### E. Backend REST PHP en XAMPP (`public/api/db.php`)

Script PHP que corre dentro del Apache de XAMPP y manipula la base de datos MySQL mediante PDO:

1. **Cabeceras CORS y JSON:**
   - Permite peticiones POST/GET/OPTIONS y devuelve siempre respuestas `application/json`.

2. **Función `getPDO()`:**
   - Crea una conexión segura con MySQL (`mysql:host=...;port=...;dbname=...`) usando `utf8mb4` para admitir acentos y caracteres especiales.

3. **Controlador de Acciones (`$action`):**
   - **`action=initialize` / `test`:**
     - Ejecuta `CREATE DATABASE IF NOT EXISTS invbulto_db`.
     - Lee y ejecuta `database.sql`.
     - Inserta el usuario estándar `admin` / `admin`.
   - **`action=get_all`:**
     - Ejecuta consultas `SELECT` en `products`, `clients`, `sales`, `expenses`, `users`, `store_settings`.
     - Mapea los tipos de datos (enteros, flotantes) y devuelve el objeto JSON consolidado.
   - **`action=save_sale` (Transacción Atómica):**
     - Inicia `$pdo->beginTransaction()`.
     - Inserta la cabecera en `sales`.
     - Inserta cada producto en `sale_items`.
     - Descuenta el stock correspondiente en `products` (`GREATEST(0, total_units_in_stock - deduct)`).
     - Ejecuta `$pdo->commit()` asegurando integridad referencial (si algo falla, hace `$pdo->rollBack()`).
   - **`action=save_expense` & `delete_expense`:**
     - Inserta o actualiza el gasto en la tabla `expenses` con su fecha, descripción (razón), categoría, monto USD, monto local y método de pago.
   - **`action=save_product` & `delete_product`:**
     - Actualiza el catálogo de productos con la relación de unidades por bulto y precios.

---

### F. Base de Datos Relacional (`public/database.sql`)

Esquema de 11 tablas relacionales optimizadas para MySQL/MariaDB:
1. **`users`:** Almacena credenciales y roles (`admin`, `gerente`, `cajero`, `almacen`).
2. **`store_settings`:** Información fiscal de la empresa, teléfono, dirección y prefijo de factura.
3. **`products`:** Inventario mayorista. Almacena unidades por bulto, stock total en unidades, costo unitario, costo bulto, precio unitario y precio bulto.
4. **`clients`:** Directorio de clientes con RIF/cédula, contacto y acumulado de compras.
5. **`sales`:** Facturas de venta con totales en USD y en moneda local (Bs.).
6. **`sale_items`:** Detalle de cada producto vendido, si fue por bulto o por unidad.
7. **`purchases`:** Facturas de compras a proveedores de mercancía.
8. **`purchase_items`:** Desglose de bultos comprados y costo unitario resultante.
9. **`expenses`:** Registro de gastos operativos (fecha, razón, categoría, monto y forma de pago).
10. **`inventory_movements`:** Kardex histórico de auditoría de entradas y salidas de stock.
11. **`exchange_rates`:** Historial de tasas de cambio del día.

---

### G. Interfaz de Usuario y Vistas Principales

#### 1. Frente de Inicio de Sesión (`src/components/auth/LoginView.tsx`)
- **Correlación:** Es la primera vista que se renderiza si `isAuthenticated` es falso.
- **Botón en la Esquina:** Si `!isDatabaseConnected`, muestra un botón flotante animado en la esquina superior derecha: *"Configurar Base de Datos"*.
- **Desaparición Automática:** Al conectar la base de datos, este botón desaparece por completo del DOM.
- **Autocompletado:** Incluye el acceso directo para rellenar usuario: `admin` y contraseña: `admin`.

#### 2. Modal de Base de Datos (`src/components/auth/DatabaseSetupModal.tsx`)
- **Correlación:** Se abre al pulsar el botón de la esquina o el banner de alerta.
- **Botón Rápido XAMPP:** Con un solo clic carga `127.0.0.1`, puerto `3306`, usuario `root` y clave vacía.
- **Acción:** Llama a la API PHP para inicializar las tablas y crea el usuario estándar `admin` con clave `admin`.

#### 3. Control de Gastos (`src/components/finances/ExpensesView.tsx`)
- **Correlación:** Vinculado al menú lateral y a `AppContext`.
- **Estructura Requerida:**
  - **Día:** Selector con botones rápidos "Hoy" y "Ayer".
  - **Razón:** Concepto detallado del gasto (alquiler, fletes, suministros).
  - **Forma de Pago:** Badges destacados para **Efectivo Divisas ($)** y **Transferencia Bancaria** (con número de referencia).
  - **Monto Bimonetario:** Conversión en vivo entre USD y moneda local.

#### 4. Punto de Venta Mayorista (`src/components/pos/PosView.tsx`)
- **Correlación:** Toma los productos de `AppContext` y procesa ventas bimonetarias.
- Permite seleccionar si el cliente compra por **Bulto Completo** o por **Unidad Suelta**.
- Descuenta automáticamente el inventario en unidades exactas y genera la factura con comprobante PDF y ticket térmico.
