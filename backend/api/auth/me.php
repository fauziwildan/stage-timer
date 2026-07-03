<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

// requireAuth() returns the user if token is valid, or exits with 401
$user = requireAuth();

jsonResponse([
    'user' => [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role']
    ]
]);
