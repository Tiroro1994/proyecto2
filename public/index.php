<?php
// En Apache XAMPP, servir index.html directamente si se solicita index.php
if (file_exists(__DIR__ . '/index.html')) {
    include __DIR__ . '/index.html';
    exit;
}
?>
