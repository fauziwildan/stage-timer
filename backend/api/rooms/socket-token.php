<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$roomId = $_GET['id'] ?? null;

if (!$roomId) {
    jsonError('Room ID required', 400);
}

$db = getDB();
$stmt = $db->prepare('SELECT owner_id FROM rooms WHERE id = ?');
$stmt->execute([$roomId]);
$room = $stmt->fetch();

if (!$room) {
    jsonError('Room not found', 404);
}

if ($user['role'] !== 'superadmin' && $room['owner_id'] !== $user['id']) {
    jsonError('Access Denied', 403);
}

// Generate secure token for Socket.io
$secret = getenv('APP_SECRET') ?: 'default_secret';
$expires = time() + 86400; // 24 hours valid
$payload = $roomId . '|controller|' . $expires;
$signature = hash_hmac('sha256', $payload, $secret);
$token = $payload . '|' . $signature;

jsonResponse(['success' => true, 'token' => $token]);
