<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$roomId = $body['roomId'] ?? null;
$role   = $body['role'] ?? null;
$pin    = (string)($body['pin'] ?? '');

if (!$roomId || !in_array($role, ['operator', 'moderator'])) {
    jsonError('Invalid parameters', 400);
}

$db = getDB();
$stmt = $db->prepare('SELECT operator_pin, moderator_pin FROM rooms WHERE id = ?');
$stmt->execute([$roomId]);
$room = $stmt->fetch();

if (!$room) {
    jsonError('Room not found', 404);
}

$hash = $role === 'operator' ? $room['operator_pin'] : $room['moderator_pin'];

if ($hash && !password_verify($pin, $hash)) {
    jsonError('Invalid PIN', 401);
}

// Generate secure token for Socket.io
$secret = getenv('APP_SECRET') ?: 'default_secret';
$expires = time() + 86400; // 24 hours valid
$payload = $roomId . '|' . $role . '|' . $expires;
$signature = hash_hmac('sha256', $payload, $secret);
$token = $payload . '|' . $signature;

jsonResponse(['success' => true, 'message' => 'Authenticated', 'token' => $token]);
