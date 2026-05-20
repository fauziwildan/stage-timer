<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$roomId = $_GET['id'] ?? null;

match ($method) {
    'GET'    => handleGet($roomId),
    'POST'   => handleCreate(),
    'PUT'    => handleUpdate($roomId),
    'DELETE' => handleDelete($roomId),
    default  => jsonError('Method not allowed', 405)
};

function handleGet(?string $roomId): never
{
    $db = getDB();
    if ($roomId) {
        $stmt = $db->prepare('SELECT * FROM rooms WHERE id = ?');
        $stmt->execute([$roomId]);
        $room = $stmt->fetch();
        if (!$room) jsonError('Room not found', 404);
        jsonResponse(dbRowToRoom($room));
    } else {
        $ownerId = getOperatorId();
        $stmt = $db->prepare('SELECT * FROM rooms WHERE owner_id = ? ORDER BY last_modified DESC LIMIT 50');
        $stmt->execute([$ownerId]);
        jsonResponse(array_map('dbRowToRoom', $stmt->fetchAll()));
    }
}

function handleCreate(): never
{
    $body = getRequestBody();
    $db   = getDB();

    function generateRoomId(): string {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $id = 'TM-';
        for ($i = 0; $i < 8; $i++) $id .= $chars[random_int(0, strlen($chars) - 1)];
        return $id;
    }

    $id   = generateRoomId();
    $now  = (int)(microtime(true) * 1000);
    $name = substr(trim($body['name'] ?? 'New Event'), 0, 255);
    $tz   = $body['timezone'] ?? 'Asia/Jakarta';

    // Ensure unique ID
    $attempts = 0;
    while ($attempts < 5) {
        $check = $db->prepare('SELECT id FROM rooms WHERE id = ?');
        $check->execute([$id]);
        if (!$check->fetch()) break;
        $id = generateRoomId();
        $attempts++;
    }

    $stmt = $db->prepare('
        INSERT INTO rooms (id, name, plan, owner_id, timezone, master_clock, on_air, blackout,
            current_timer_index, primary_color, background_color, created_at, last_modified)
        VALUES (?, ?, "free", ?, ?, 1, 0, 0, 0, "#3b82f6", "#0f172a", ?, ?)
    ');
    $stmt->execute([$id, $name, getOperatorId(), $tz, $now, $now]);

    $room = $db->prepare('SELECT * FROM rooms WHERE id = ?');
    $room->execute([$id]);
    jsonResponse(dbRowToRoom($room->fetch()), 201);
}

function handleUpdate(?string $roomId): never
{
    if (!$roomId) jsonError('Room ID required');
    $body = getRequestBody();
    $db   = getDB();

    $allowed = ['name', 'timezone', 'master_clock', 'on_air', 'blackout', 'primary_color', 'background_color', 'active_timer_id', 'current_timer_index'];
    $sets = []; $vals = [];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $sets[] = "`$field` = ?";
            $vals[] = $body[$field];
        }
    }
    if (empty($sets)) jsonError('Nothing to update');

    $sets[] = 'last_modified = ?';
    $vals[] = (int)(microtime(true) * 1000);
    $vals[] = $roomId;

    $db->prepare('UPDATE rooms SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
    $stmt = $db->prepare('SELECT * FROM rooms WHERE id = ?');
    $stmt->execute([$roomId]);
    $room = $stmt->fetch();
    if (!$room) jsonError('Room not found', 404);
    jsonResponse(dbRowToRoom($room));
}

function handleDelete(?string $roomId): never
{
    if (!$roomId) jsonError('Room ID required');
    $db = getDB();
    $stmt = $db->prepare('DELETE FROM rooms WHERE id = ?');
    $stmt->execute([$roomId]);
    jsonResponse(['deleted' => $roomId]);
}

function dbRowToRoom(array $row): array
{
    return [
        'id'                 => $row['id'],
        'name'               => $row['name'],
        'password'           => null,
        'plan'               => $row['plan'],
        'ownerId'            => $row['owner_id'],
        'timezone'           => $row['timezone'],
        'masterClock'        => (bool)$row['master_clock'],
        'onAir'              => (bool)$row['on_air'],
        'blackout'           => (bool)$row['blackout'],
        'currentTimerIndex'  => (int)$row['current_timer_index'],
        'activeTimerId'      => $row['active_timer_id'],
        'logo'               => $row['logo'] ?? null,
        'primaryColor'       => $row['primary_color'],
        'backgroundColor'    => $row['background_color'],
        'createdAt'          => (int)$row['created_at'],
        'lastModified'       => (int)$row['last_modified'],
        'syncStatus'         => 'synced',
    ];
}
