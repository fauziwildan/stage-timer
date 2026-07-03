<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$roomId = $_GET['id'] ?? null;

$action = $_GET['action'] ?? null;

match ($method) {
    'GET'    => handleGet($roomId),
    'POST'   => ($action === 'duplicate' && $roomId) ? handleDuplicate($roomId) : handleCreate(),
    'PUT'    => handleUpdate($roomId),
    'DELETE' => handleDelete($roomId),
    default  => jsonError('Method not allowed', 405)
};

function handleGet(?string $roomId): never
{
    $db = getDB();
    $isTemplate = isset($_GET['template']) ? 1 : 0;
    
    if ($roomId) {
        $stmt = $db->prepare('SELECT * FROM rooms WHERE id = ?');
        $stmt->execute([$roomId]);
        $room = $stmt->fetch();
        if (!$room) jsonError('Room not found', 404);
        jsonResponse(dbRowToRoom($room));
    } else {
        $user = requireAuth();
        $ownerId = $user['id'];
        if ($isTemplate) {
            $stmt = $db->prepare('SELECT * FROM rooms WHERE is_template = 1 AND is_archived = 0 ORDER BY last_modified DESC');
            $stmt->execute();
        } else {
            $stmt = $db->prepare('SELECT * FROM rooms WHERE owner_id = ? AND is_archived = 0 ORDER BY last_modified DESC LIMIT 50');
            $stmt->execute([$ownerId]);
        }
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

    $user = requireAuth();

    $stmt = $db->prepare('
        INSERT INTO rooms (id, name, plan, owner_id, timezone, master_clock, on_air, blackout,
            current_timer_index, primary_color, background_color, venue_info, is_archived, is_template, created_at, last_modified)
        VALUES (?, ?, "free", ?, ?, 1, 0, 0, 0, "#3b82f6", "#0f172a", NULL, 0, 0, ?, ?)
    ');
    $stmt->execute([$id, $name, $user['id'], $tz, $now, $now]);

    $room = $db->prepare('SELECT * FROM rooms WHERE id = ?');
    $room->execute([$id]);
    jsonResponse(dbRowToRoom($room->fetch()), 201);
}

function handleDuplicate(string $sourceId): never
{
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM rooms WHERE id = ?');
    $stmt->execute([$sourceId]);
    $sourceRoom = $stmt->fetch();
    
    if (!$sourceRoom) jsonError('Source room not found', 404);
    
    function generateRoomId(): string {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $id = 'TM-';
        for ($i = 0; $i < 8; $i++) $id .= $chars[random_int(0, strlen($chars) - 1)];
        return $id;
    }

    $id = generateRoomId();
    $now = (int)(microtime(true) * 1000);
    
    $user = requireAuth();

    // Duplicate Room
    $insertRoom = $db->prepare('
        INSERT INTO rooms (id, name, password_hash, plan, owner_id, timezone, master_clock, on_air, blackout,
            current_timer_index, active_timer_id, layouts, logo, primary_color, background_color, venue_info, is_archived, is_template, created_at, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    ');
    $newName = $sourceRoom['name'] . ' (Copy)';
    $insertRoom->execute([
        $id, $newName, $sourceRoom['password_hash'], $sourceRoom['plan'], $user['id'], 
        $sourceRoom['timezone'], $sourceRoom['master_clock'], 0, 0, 
        0, null, $sourceRoom['layouts'], $sourceRoom['logo'], $sourceRoom['primary_color'], $sourceRoom['background_color'], 
        $sourceRoom['venue_info'], $now, $now
    ]);
    
    // Duplicate Timers
    $stmtTimers = $db->prepare('SELECT * FROM timers WHERE room_id = ?');
    $stmtTimers->execute([$sourceId]);
    $timers = $stmtTimers->fetchAll();
    
    $insertTimer = $db->prepare('
        INSERT INTO timers (id, room_id, parent_id, sort_order, title, speaker, pic, duration, elapsed, remaining, timer_mode, status, trigger_type, wrapup_colors, chime, chime_at, notes, attachment_url, attachment_path, bg_color, text_color, show_speaker, show_title, is_locked, overtime_limit, planned_start, started_at, paused_at, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, "idle", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
    ');
    
    foreach ($timers as $t) {
        $newTimerId = \uuid_create(); // assuming uuid function exists, or we use uniqid
        // actually there is no uuid_create in pure php without pecl uuid, let's use random bytes
        $newTimerId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
        $insertTimer->execute([
            $newTimerId, $id, $t['parent_id'], $t['sort_order'], $t['title'], $t['speaker'], $t['pic'],
            $t['duration'], $t['duration'], $t['timer_mode'], $t['trigger_type'], $t['wrapup_colors'],
            $t['chime'], $t['chime_at'], $t['notes'], $t['attachment_url'], $t['attachment_path'],
            $t['bg_color'], $t['text_color'], $t['show_speaker'], $t['show_title'], $t['is_locked'],
            $t['overtime_limit'], $t['planned_start'], $now
        ]);
    }
    
    $newRoom = $db->prepare('SELECT * FROM rooms WHERE id = ?');
    $newRoom->execute([$id]);
    jsonResponse(dbRowToRoom($newRoom->fetch()), 201);
}

function handleUpdate(?string $roomId): never
{
    requireAuth();
    if (!$roomId) jsonError('Room ID required');
    $body = getRequestBody();
    $db   = getDB();

    $allowed = ['name', 'timezone', 'master_clock', 'on_air', 'blackout', 'primary_color', 'background_color', 'active_timer_id', 'current_timer_index', 'venue_info', 'is_archived', 'is_template', 'layouts'];
    $sets = []; $vals = [];
    
    // Handle PIN updates
    if (array_key_exists('operator_pin', $body)) {
        $sets[] = 'operator_pin = ?';
        $vals[] = $body['operator_pin'] ? password_hash($body['operator_pin'], PASSWORD_DEFAULT) : null;
    }
    if (array_key_exists('moderator_pin', $body)) {
        $sets[] = 'moderator_pin = ?';
        $vals[] = $body['moderator_pin'] ? password_hash($body['moderator_pin'], PASSWORD_DEFAULT) : null;
    }
    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $sets[] = "`$field` = ?";
            $vals[] = $field === 'layouts' ? json_encode($body[$field]) : $body[$field];
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
    requireAuth();
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
        'hasOperatorPin'     => !empty($row['operator_pin']),
        'hasModeratorPin'    => !empty($row['moderator_pin']),
        'plan'               => $row['plan'],
        'ownerId'            => $row['owner_id'],
        'timezone'           => $row['timezone'],
        'masterClock'        => (bool)$row['master_clock'],
        'onAir'              => (bool)$row['on_air'],
        'blackout'           => (bool)$row['blackout'],
        'currentTimerIndex'  => (int)$row['current_timer_index'],
        'activeTimerId'      => $row['active_timer_id'],
        'logo'               => $row['logo'] ?? null,
        'layouts'            => isset($row['layouts']) ? json_decode($row['layouts'], true) : null,
        'primaryColor'       => $row['primary_color'],
        'backgroundColor'    => $row['background_color'],
        'venueInfo'          => $row['venue_info'] ?? null,
        'isArchived'         => (bool)$row['is_archived'],
        'isTemplate'         => (bool)$row['is_template'],
        'createdAt'          => (int)$row['created_at'],
        'lastModified'       => (int)$row['last_modified'],
        'syncStatus'         => 'synced',
    ];
}
