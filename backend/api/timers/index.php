<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$timerId = $_GET['id'] ?? null;
$roomId  = $_GET['room_id'] ?? null;
$action  = $_GET['action'] ?? null;

if ($action === 'reorder' && $method === 'PUT') { handleReorder(); }

match ($method) {
    'GET'    => handleGet($timerId, $roomId),
    'POST'   => handleCreate(),
    'PUT'    => handleUpdate($timerId),
    'DELETE' => handleDelete($timerId),
    default  => jsonError('Method not allowed', 405)
};

function handleGet(?string $timerId, ?string $roomId): never
{
    $db = getDB();
    if ($timerId) {
        $stmt = $db->prepare('SELECT * FROM timers WHERE id = ?');
        $stmt->execute([$timerId]);
        $timer = $stmt->fetch();
        if (!$timer) jsonError('Timer not found', 404);
        jsonResponse(dbRowToTimer($timer));
    } elseif ($roomId) {
        $stmt = $db->prepare('SELECT * FROM timers WHERE room_id = ? ORDER BY sort_order ASC');
        $stmt->execute([$roomId]);
        jsonResponse(array_map('dbRowToTimer', $stmt->fetchAll()));
    } else {
        jsonError('Provide id or room_id');
    }
}

function handleCreate(): never
{
    $body = getRequestBody();
    $db   = getDB();

    $roomId = $body['roomId'] ?? null;
    if (!$roomId) jsonError('roomId required');

    $id  = bin2hex(random_bytes(16));
    $now = (int)(microtime(true) * 1000);
    $dur = (int)($body['duration'] ?? 600);

    $defaultWrapup = json_encode([
        'stage1' => ['threshold' => 300, 'color' => '#eab308'],
        'stage2' => ['threshold' => 120, 'color' => '#f97316'],
        'stage3' => ['threshold' => 0,   'color' => '#ef4444'],
    ]);

    $maxOrder = $db->prepare('SELECT COALESCE(MAX(sort_order), -1) FROM timers WHERE room_id = ?');
    $maxOrder->execute([$roomId]);
    $order = (int)$maxOrder->fetchColumn() + 1;

    $stmt = $db->prepare('
        INSERT INTO timers (id, room_id, parent_id, sort_order, title, speaker, pic, duration, elapsed, remaining,
            timer_mode, status, trigger_type, wrapup_colors, chime, chime_at, notes, attachment_url, attachment_path, bg_color, text_color,
            show_speaker, show_title, is_locked, overtime_limit, planned_start, last_modified)
        VALUES (?, ?, NULL, ?, ?, ?, "", ?, 0, ?, "countdown", "idle", "manual", ?, "none", 60, ?, NULL, NULL, "", "", 1, 1, 0, 0, NULL, ?)
    ');
    $stmt->execute([
        $id, $roomId, $order,
        substr($body['title'] ?? 'New Timer', 0, 255),
        substr($body['speaker'] ?? '', 0, 255),
        $dur, $dur,
        $body['wrapupColors'] ? json_encode($body['wrapupColors']) : $defaultWrapup,
        substr($body['notes'] ?? '', 0, 2000),
        $now
    ]);

    $row = $db->prepare('SELECT * FROM timers WHERE id = ?');
    $row->execute([$id]);
    jsonResponse(dbRowToTimer($row->fetch()), 201);
}

function handleUpdate(?string $timerId): never
{
    if (!$timerId) jsonError('Timer ID required');
    $body = getRequestBody();
    $db   = getDB();

    $map = [
        'title' => 'title', 'speaker' => 'speaker', 'duration' => 'duration',
        'elapsed' => 'elapsed', 'remaining' => 'remaining', 'status' => 'status',
        'notes' => 'notes', 'sortOrder' => 'sort_order', 'startedAt' => 'started_at',
        'pausedAt' => 'paused_at', 'showSpeaker' => 'show_speaker', 'showTitle' => 'show_title',
        'parentId' => 'parent_id', 'pic' => 'pic', 'timerMode' => 'timer_mode',
        'attachmentUrl' => 'attachment_url', 'attachmentPath' => 'attachment_path',
        'isLocked' => 'is_locked', 'plannedStart' => 'planned_start', 'trigger' => 'trigger_type'
    ];

    $sets = []; $vals = [];
    foreach ($map as $jsKey => $dbCol) {
        if (array_key_exists($jsKey, $body)) {
            $sets[] = "`$dbCol` = ?";
            $vals[] = $body[$jsKey];
        }
    }
    if (isset($body['wrapupColors'])) {
        $sets[] = 'wrapup_colors = ?';
        $vals[] = json_encode($body['wrapupColors']);
    }
    if (empty($sets)) jsonError('Nothing to update');

    $sets[] = 'last_modified = ?';
    $vals[] = (int)(microtime(true) * 1000);
    $vals[] = $timerId;
    $db->prepare('UPDATE timers SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);

    $row = $db->prepare('SELECT * FROM timers WHERE id = ?');
    $row->execute([$timerId]);
    jsonResponse(dbRowToTimer($row->fetch()));
}

function handleReorder(): never
{
    $body = getRequestBody();
    $db   = getDB();
    $ids  = $body['orderedIds'] ?? [];
    $stmt = $db->prepare('UPDATE timers SET sort_order = ?, last_modified = ? WHERE id = ?');
    $now  = (int)(microtime(true) * 1000);
    foreach ($ids as $i => $id) $stmt->execute([$i, $now, $id]);
    jsonResponse(['reordered' => count($ids)]);
}

function handleDelete(?string $timerId): never
{
    if (!$timerId) jsonError('Timer ID required');
    $db = getDB();
    $db->prepare('DELETE FROM timers WHERE id = ?')->execute([$timerId]);
    jsonResponse(['deleted' => $timerId]);
}

function dbRowToTimer(array $row): array
{
    $wrapup = json_decode($row['wrapup_colors'] ?? '{}', true);
    if (!$wrapup || !isset($wrapup['stage1'])) {
        $wrapup = [
            'stage1' => ['threshold' => 300, 'color' => '#eab308'],
            'stage2' => ['threshold' => 120, 'color' => '#f97316'],
            'stage3' => ['threshold' => 0,   'color' => '#ef4444'],
        ];
    }
    return [
        'id'            => $row['id'],
        'roomId'        => $row['room_id'],
        'parentId'      => $row['parent_id'],
        'order'         => (int)$row['sort_order'],
        'title'         => $row['title'],
        'speaker'       => $row['speaker'],
        'pic'           => $row['pic'] ?? '',
        'duration'      => (int)$row['duration'],
        'elapsed'       => (int)$row['elapsed'],
        'remaining'     => (int)$row['remaining'],
        'timerMode'     => $row['timer_mode'] ?? 'countdown',
        'status'        => $row['status'],
        'trigger'       => $row['trigger_type'],
        'wrapupColors'  => $wrapup,
        'chime'         => $row['chime'],
        'chimeAt'       => (int)$row['chime_at'],
        'notes'         => $row['notes'],
        'attachmentUrl' => $row['attachment_url'],
        'attachmentPath'=> $row['attachment_path'],
        'backgroundColor' => $row['bg_color'],
        'textColor'     => $row['text_color'],
        'showSpeaker'   => (bool)$row['show_speaker'],
        'showTitle'     => (bool)$row['show_title'],
        'isLocked'      => (bool)$row['is_locked'],
        'overtimeLimit' => (int)$row['overtime_limit'],
        'plannedStart'  => $row['planned_start'] ? (int)$row['planned_start'] : null,
        'startedAt'     => $row['started_at'] ? (int)$row['started_at'] : null,
        'pausedAt'      => $row['paused_at'] ? (int)$row['paused_at'] : null,
        'lastModified'  => (int)$row['last_modified'],
        'syncStatus'    => 'synced',
    ];
}
