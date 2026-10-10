<?php
/**
 * Puente de Ejecución para Apache / XAMPP (htdocs)
 * InvBulto POS - Sistema Mayorista
 */

// Si existe la carpeta dist/ con el build listo para producción
if (file_exists(__DIR__ . '/dist/index.html')) {
    // Si la solicitud es directamente a la raíz de la carpeta en htdocs
    $htmlContent = file_get_contents(__DIR__ . '/dist/index.html');
    
    // Asegurar que las rutas relativas a ./assets/ funcionen en subdirectorios de htdocs
    // Si se accede como http://localhost/mi-carpeta/ o http://localhost/
    header('Content-Type: text/html; charset=UTF-8');
    
    // Corregir base href dinámicamente según la URL actual en XAMPP
    $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
    $basePath = rtrim($scriptDir, '/') . '/dist/';
    
    // Si se accede a la carpeta, servir el contenido compilado con la ruta de assets adecuada
    $htmlContent = str_replace('./assets/', $basePath . 'assets/', $htmlContent);
    echo $htmlContent;
    exit;
}

// Si aún no se ha ejecutado 'npm run build', mostrar guía clara para XAMPP
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InvBulto POS - Configuración para XAMPP</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; text-align: center; }
        .card { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); text-align: left; }
        h1 { font-size: 22px; color: #10b981; margin-top: 0; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
        code { background: #0f172a; color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-family: monospace; }
        .btn { display: inline-block; background: #10b981; color: #022c22; font-weight: bold; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
        .step { margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🚀 Preparación de InvBulto POS para XAMPP</h1>
        <p>Para ejecutar el sistema en la carpeta <code>htdocs</code> de XAMPP:</p>
        
        <div class="step">
            <strong>Paso 1: Generar archivos compilados</strong>
            <p>En la consola de su proyecto, ejecute el comando:</p>
            <code>npm run build</code>
        </div>

        <div class="step">
            <strong>Paso 2: Copiar a htdocs</strong>
            <p>Copie los archivos de la carpeta <code>dist/</code> directamente dentro de <code>C:/xampp/htdocs/invbulto/</code> (o la carpeta de su preferencia).</p>
        </div>

        <div class="step">
            <strong>Paso 3: Abrir en el navegador</strong>
            <p>Abra en su navegador web favorito:</p>
            <code>http://localhost/invbulto/</code>
        </div>
    </div>
</body>
</html>
