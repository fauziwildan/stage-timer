<?php
/**
 * Time-Manager Backend Entry Point
 * Route: /time-manager/backend/...
 */
declare(strict_types=1);

header('Content-Type: application/json');
echo json_encode([
    'app'     => 'Time-Manager Backend',
    'version' => '2.6.0',
    'status'  => 'running',
    'time'    => round(microtime(true) * 1000),
    'endpoints' => [
        'rooms'    => '/api/rooms/',
        'timers'   => '/api/timers/',
        'messages' => '/api/messages/',
        'sync'     => '/api/sync/',
    ]
]);
