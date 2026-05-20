<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($action === 'ping') {
    jsonResponse(['version' => '2.6.0', 'time' => round(microtime(true) * 1000)]);
}

match ($method) {
    'GET'  => handlePull(),
    'POST' => handlePush(),
    default => jsonError('Method not allowed', 405)
};

function handlePull(): never
{
    $roomId = $_GET['room_id'] ?? null;
    $since  = (int)($_GET['since'] ?? 0);
    if (!$roomId) jsonError('room_id required');

    $db = getDB();

    $roomStmt = $db->prepare('SELECT * FROM rooms WHERE id = ?');
    $roomStmt->execute([$roomId]);
    $room = $roomStmt->fetch();
    if (!$room) jsonError('Room not found', 404);

    $timersStmt = $db->prepare('SELECT * FROM timers WHERE room_id = ? AND last_modified > ? ORDER BY sort_order');
    $timersStmt->execute([$roomId, $since]);

    $msgsStmt = $db->prepare('SELECT * FROM messages WHERE room_id = ? AND last_modified > ? ORDER BY created_at DESC');
    $msgsStmt->execute([$roomId, $since]);

    jsonResponse([
        'roomId'    => $roomId,
        'room'      => dbRowToRoom($room),
        'timers'    => array_map('dbRowToTimer', $timersStmt->fetchAll()),
        'messages'  => array_map('dbRowToMessage', $msgsStmt->fetchAll()),
        'timestamp' => (int)(microtime(true) * 1000),
        'operatorId' => 'server'
    ]);
}

function handlePush(): never
{
    $body   = getRequestBody();
    $db     = getDB();
    $roomId = $body['roomId'] ?? null;
    if (!$roomId) jsonError('roomId required');

    $accepted  = 0;
    $conflicts = 0;

    // Upsert timers
    foreach (($body['timers'] ?? []) as $t) {
        if (empty($t['id'])) continue;
        $existing = $db->prepare('SELECT last_modified FROM timers WHERE id = ?');
        $existing->execute([$t['id']]);
        $row = $existing->fetch();

        if (!$row || (int)$t['lastModified'] >= (int)$row['last_modified']) {
            // Accept — upsert
            upsertTimer($db, $roomId, $t);
            $accepted++;
        } else {
            $conflicts++;
        }
    }

    // Upsert messages
    foreach (($body['messages'] ?? []) as $m) {
        if (empty($m['id'])) continue;
        upsertMessage($db, $roomId, $m);
        $accepted++;
    }

    jsonResponse(['accepted' => $accepted, 'conflicts' => $conflicts]);
}

function upsertTimer(PDO $db, string $roomId, array $t): void
{
    $db->prepare('
        INSERT INTO timers (id, room_id, sort_order, title, speaker, duration, elapsed, remaining, status,
            trigger_type, wrapup_colors, chime, chime_at, notes, bg_color, text_color, show_speaker, show_title,
            overtime_limit, started_at, paused_at, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            sort_order = VALUES(sort_order), title = VALUES(title), speaker = VALUES(speaker),
            duration = VALUES(duration), elapsed = VALUES(elapsed), remaining = VALUES(remaining),
            status = VALUES(status), started_at = VALUES(started_at), paused_at = VALUES(paused_at),
            last_modified = VALUES(last_modified)
    ')->execute([
        $t['id'], $roomId, $t['order'] ?? 0, $t['title'] ?? 'Timer', $t['speaker'] ?? '',
        $t['duration'] ?? 600, $t['elapsed'] ?? 0, $t['remaining'] ?? 600,
        $t['status'] ?? 'idle', $t['trigger'] ?? 'manual',
        json_encode($t['wrapupColors'] ?? []),
        $t['chime'] ?? 'none', $t['chimeAt'] ?? 60, $t['notes'] ?? '',
        $t['backgroundColor'] ?? '', $t['textColor'] ?? '',
        (int)($t['showSpeaker'] ?? 1), (int)($t['showTitle'] ?? 1),
        $t['overtimeLimit'] ?? 0, $t['startedAt'] ?? null, $t['pausedAt'] ?? null,
        $t['lastModified'] ?? round(microtime(true) * 1000)
    ]);
}

function upsertMessage(PDO $db, string $roomId, array $m): void
{
    $db->prepare('
        INSERT INTO messages (id, room_id, text, type, bg_color, text_color, emoji, is_active, flash, created_at, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE text = VALUES(text), is_active = VALUES(is_active), last_modified = VALUES(last_modified)
    ')->execute([
        $m['id'], $roomId, $m['text'] ?? '', $m['type'] ?? 'normal',
        $m['backgroundColor'] ?? '#1e293b', $m['textColor'] ?? '#ffffff',
        $m['emoji'] ?? '', (int)($m['isActive'] ?? 0), (int)($m['flash'] ?? 0),
        $m['createdAt'] ?? round(microtime(true) * 1000),
        $m['lastModified'] ?? round(microtime(true) * 1000)
    ]);
}

// Include helper functions from rooms/timers/messages
function dbRowToRoom(array $row): array {
    return ['id' => $row['id'], 'name' => $row['name'], 'plan' => $row['plan'],
        'timezone' => $row['timezone'], 'masterClock' => (bool)$row['master_clock'],
        'onAir' => (bool)$row['on_air'], 'blackout' => (bool)$row['blackout'],
        'activeTimerId' => $row['active_timer_id'], 'lastModified' => (int)$row['last_modified'],
        'primaryColor' => $row['primary_color'], 'backgroundColor' => $row['background_color'], 'syncStatus' => 'synced'];
}

function dbRowToTimer(array $row): array {
    $wrapup = json_decode($row['wrapup_colors'] ?? '{}', true) ?: ['stage1' => ['threshold' => 300, 'color' => '#eab308'], 'stage2' => ['threshold' => 120, 'color' => '#f97316'], 'stage3' => ['threshold' => 0, 'color' => '#ef4444']];
    return ['id' => $row['id'], 'roomId' => $row['room_id'], 'order' => (int)$row['sort_order'],
        'title' => $row['title'], 'speaker' => $row['speaker'], 'duration' => (int)$row['duration'],
        'elapsed' => (int)$row['elapsed'], 'remaining' => (int)$row['remaining'], 'status' => $row['status'],
        'trigger' => $row['trigger_type'], 'wrapupColors' => $wrapup, 'chime' => $row['chime'],
        'chimeAt' => (int)$row['chime_at'], 'notes' => $row['notes'], 'backgroundColor' => $row['bg_color'],
        'textColor' => $row['text_color'], 'showSpeaker' => (bool)$row['show_speaker'],
        'showTitle' => (bool)$row['show_title'], 'overtimeLimit' => (int)$row['overtime_limit'],
        'startedAt' => $row['started_at'] ? (int)$row['started_at'] : null,
        'pausedAt' => $row['paused_at'] ? (int)$row['paused_at'] : null,
        'lastModified' => (int)$row['last_modified'], 'syncStatus' => 'synced'];
}

function dbRowToMessage(array $row): array {
    return ['id' => $row['id'], 'roomId' => $row['room_id'], 'text' => $row['text'],
        'type' => $row['type'], 'backgroundColor' => $row['bg_color'], 'textColor' => $row['text_color'],
        'emoji' => $row['emoji'], 'isActive' => (bool)$row['is_active'], 'flash' => (bool)$row['flash'],
        'createdAt' => (int)$row['created_at'], 'expiresAt' => $row['expires_at'] ? (int)$row['expires_at'] : null,
        'lastModified' => (int)$row['last_modified'], 'syncStatus' => 'synced'];
}
