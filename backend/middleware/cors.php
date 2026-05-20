<?php
declare(strict_types=1);

function setCorsHeaders(): void
{
    $allowedOrigins = [
        'https://timemanager.motionharbour.com',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowedOrigins, true) || str_starts_with($origin, 'http://192.168.')) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header('Access-Control-Allow-Origin: https://timemanager.motionharbour.com');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Operator-ID');
    header('Access-Control-Max-Age: 86400');
    header('Vary: Origin');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => $status < 400, 'data' => $data, 'timestamp' => round(microtime(true) * 1000)]);
    exit;
}

function jsonError(string $error, int $status = 400): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => $error, 'timestamp' => round(microtime(true) * 1000)]);
    exit;
}

function getRequestBody(): array
{
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function getOperatorId(): string
{
    return $_SERVER['HTTP_X_OPERATOR_ID'] ?? 'unknown';
}
