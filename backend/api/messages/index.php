<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';

setCorsHeaders();

$method    = $_SERVER['REQUEST_METHOD'];
$messageId = $_GET['id'] ?? null;
$roomId    = $_GET['room_id'] ?? null;

match ($method) {
    'GET'    => handleGet($messageId, $roomId),
    'POST'   => handleCreate(),
    'DELETE' => handleDelete($messageId),
    default  => jsonError('Method not allowed', 405)
};

function handleGet(?string $messageId, ?string $roomId): never
{
    $db = getDB();
    if ($messageId) {
        $stmt = $db->prepare('SELECT * FROM messages WHERE id = ?');
        $stmt->execute([$messageId]);
        $msg = $stmt->fetch();
        if (!$msg) jsonError('Message not found', 404);
        jsonResponse(dbRowToMessage($msg));
    } elseif ($roomId) {
        $stmt = $db->prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 100');
        $stmt->execute([$roomId]);
        jsonResponse(array_map('dbRowToMessage', $stmt->fetchAll()));
    } else {
        jsonError('Provide id or room_id');
    }
}

function handleCreate(): never
{
    $body   = getRequestBody();
    $db     = getDB();
    $roomId = $body['roomId'] ?? null;
    if (!$roomId) jsonError('roomId required');

    $id  = bin2hex(random_bytes(16));
    $now = (int)(microtime(true) * 1000);

    $stmt = $db->prepare('
        INSERT INTO messages (id, room_id, text, type, bg_color, text_color, emoji, is_active, flash, created_at, expires_at, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $id, $roomId,
        substr($body['text'] ?? '', 0, 1000),
        $body['type'] ?? 'normal',
        $body['backgroundColor'] ?? '#1e293b',
        $body['textColor'] ?? '#ffffff',
        $body['emoji'] ?? '',
        (int)($body['flash'] ?? 0),
        $now,
        $body['expiresAt'] ?? null,
        $now
    ]);

    $row = $db->prepare('SELECT * FROM messages WHERE id = ?');
    $row->execute([$id]);
    jsonResponse(dbRowToMessage($row->fetch()), 201);
}

function handleDelete(?string $messageId): never
{
    if (!$messageId) jsonError('Message ID required');
    $db = getDB();
    $db->prepare('DELETE FROM messages WHERE id = ?')->execute([$messageId]);
    jsonResponse(['deleted' => $messageId]);
}

function dbRowToMessage(array $row): array
{
    return [
        'id'              => $row['id'],
        'roomId'          => $row['room_id'],
        'text'            => $row['text'],
        'type'            => $row['type'],
        'backgroundColor' => $row['bg_color'],
        'textColor'       => $row['text_color'],
        'emoji'           => $row['emoji'],
        'isActive'        => (bool)$row['is_active'],
        'flash'           => (bool)$row['flash'],
        'createdAt'       => (int)$row['created_at'],
        'expiresAt'       => $row['expires_at'] ? (int)$row['expires_at'] : null,
        'lastModified'    => (int)$row['last_modified'],
        'syncStatus'      => 'synced',
    ];
}
