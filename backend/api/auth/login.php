<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$email = $body['email'] ?? '';
$password = $body['password'] ?? '';

if (!$email || !$password) {
    jsonError('Email and password required');
}

$db = getDB();
$stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    jsonError('Invalid email or password', 401);
}

// Generate new token on login (simple token auth)
$token = bin2hex(random_bytes(32));
$db->prepare('UPDATE users SET api_token = ? WHERE id = ?')->execute([$token, $user['id']]);

jsonResponse([
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role']
    ]
]);
