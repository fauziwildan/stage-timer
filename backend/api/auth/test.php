<?php
require_once __DIR__ . '/../../middleware/cors.php';
setCorsHeaders();
$headers = [];
if (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
}
jsonResponse([
    'SERVER_AUTH' => $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? 'not-set',
    'APACHE_HEADERS' => $headers,
    'ALL_SERVER' => array_filter($_SERVER, fn($k) => str_starts_with($k, 'HTTP_'), ARRAY_FILTER_USE_KEY)
]);
