<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

function requireAuth(): array {
    $authHeader = '';
    
    // Most robust way to get Auth header across different Server APIs (Apache, Nginx, FastCGI)
    if (isset($_SERVER['HTTP_X_API_TOKEN'])) {
        $authHeader = 'Bearer ' . trim($_SERVER['HTTP_X_API_TOKEN']);
    } elseif (isset($_SERVER['Authorization'])) {
        $authHeader = trim($_SERVER['Authorization']);
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        jsonError('Unauthorized: Missing or invalid token (Header: ' . ($authHeader ?: 'empty') . ')', 401);
    }
    
    $token = $matches[1];
    $db = getDB();
    
    $stmt = $db->prepare('SELECT * FROM users WHERE api_token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonError('Unauthorized: Invalid token (Token: ' . $token . ')', 401);
    }
    
    return $user;
}

if (!function_exists('apache_request_headers')) {
    function apache_request_headers() {
        $arh = array();
        $rx_http = '/\AHTTP_/';
        foreach($_SERVER as $key => $val) {
            if(preg_match($rx_http, $key)) {
                $arh_key = preg_replace($rx_http, '', $key);
                $rx_matches = array();
                $rx_matches = explode('_', $arh_key);
                if(count($rx_matches) > 0 and strlen($arh_key) > 2) {
                    foreach($rx_matches as $ak_key => $ak_val) $rx_matches[$ak_key] = ucfirst(strtolower($ak_val));
                    $arh_key = implode('-', $rx_matches);
                }
                $arh[$arh_key] = $val;
            }
        }
        return $arh;
    }
}
