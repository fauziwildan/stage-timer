<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$name = $body['name'] ?? '';
$email = $body['email'] ?? '';
$password = $body['password'] ?? '';

if (!$name || !$email || !$password) {
    jsonError('Name, email, and password required');
}

$db = getDB();
$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError('Email already registered', 400);
}

$id = bin2hex(random_bytes(16));
$token = bin2hex(random_bytes(32));
$hash = password_hash($password, PASSWORD_BCRYPT);
$now = (int)(microtime(true) * 1000);

$stmt = $db->prepare('INSERT INTO users (id, name, email, password_hash, role, api_token, created_at) VALUES (?, ?, ?, ?, "owner", ?, ?)');
$stmt->execute([$id, $name, $email, $hash, $token, $now]);

jsonResponse([
    'token' => $token,
    'user' => [
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'role' => 'owner'
    ]
], 201);
