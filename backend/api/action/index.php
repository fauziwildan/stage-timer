<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getRequestBody();
$roomId = $body['roomId'] ?? null;
$action = $body['action'] ?? null; // 'start_next', 'pause', 'reset', 'nudge'
$value = $body['value'] ?? null; // used for nudge (+10, -10)

if (!$roomId || !$action) {
    jsonError('roomId and action are required');
}

$db = getDB();

// Fetch all timers for the room to determine state
$stmt = $db->prepare('SELECT * FROM timers WHERE room_id = ? ORDER BY sort_order ASC');
$stmt->execute([$roomId]);
$timers = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($timers)) {
    jsonError('No timers found in room');
}

$now = (int)(microtime(true) * 1000);

switch ($action) {
    case 'start_next':
        // Find current running
        $runningIdx = -1;
        $nextIdx = -1;
        foreach ($timers as $i => $t) {
            if (in_array($t['status'], ['running', 'overtime'])) {
                $runningIdx = $i;
            }
        }
        
        if ($runningIdx !== -1) {
            // Pause current
            $curr = $timers[$runningIdx];
            $stmt = $db->prepare('UPDATE timers SET status = "finished", last_modified = ? WHERE id = ?');
            $stmt->execute([$now, $curr['id']]);
            $nextIdx = $runningIdx + 1;
        } else {
            // Find first idle or paused
            foreach ($timers as $i => $t) {
                if ($t['status'] === 'idle' || $t['status'] === 'paused') {
                    $nextIdx = $i;
                    break;
                }
            }
        }
        
        if ($nextIdx !== -1 && isset($timers[$nextIdx])) {
            $next = $timers[$nextIdx];
            $stmt = $db->prepare('UPDATE timers SET status = "running", started_at = COALESCE(started_at, ?), last_modified = ? WHERE id = ?');
            $stmt->execute([$now, $now, $next['id']]);
            jsonResponse(['success' => true, 'message' => 'Started timer ' . $next['title']]);
        } else {
            jsonResponse(['success' => false, 'message' => 'No next timer available']);
        }
        break;

    case 'pause':
        // Pause any running timer
        $pausedCount = 0;
        foreach ($timers as $t) {
            if (in_array($t['status'], ['running', 'overtime'])) {
                $stmt = $db->prepare('UPDATE timers SET status = "paused", paused_at = ?, last_modified = ? WHERE id = ?');
                $stmt->execute([$now, $now, $t['id']]);
                $pausedCount++;
            }
        }
        jsonResponse(['success' => true, 'message' => "Paused $pausedCount timers"]);
        break;

    case 'reset':
        // Reset the active (running or paused) timer
        foreach ($timers as $t) {
            if (in_array($t['status'], ['running', 'overtime', 'paused'])) {
                $stmt = $db->prepare('UPDATE timers SET status = "idle", elapsed = 0, remaining = duration, started_at = NULL, paused_at = NULL, last_modified = ? WHERE id = ?');
                $stmt->execute([$now, $t['id']]);
            }
        }
        jsonResponse(['success' => true, 'message' => 'Reset active timers']);
        break;
        
    case 'nudge':
        $sec = (int)$value;
        foreach ($timers as $t) {
            if (in_array($t['status'], ['running', 'overtime', 'paused'])) {
                $rem = max(0, $t['remaining'] + $sec);
                $elap = max(0, $t['duration'] - $rem);
                $stmt = $db->prepare('UPDATE timers SET remaining = ?, elapsed = ?, last_modified = ? WHERE id = ?');
                $stmt->execute([$rem, $elap, $now, $t['id']]);
            }
        }
        jsonResponse(['success' => true, 'message' => "Nudged by $sec seconds"]);
        break;

    default:
        jsonError('Unknown action');
}
