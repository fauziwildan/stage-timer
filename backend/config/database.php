<?php
declare(strict_types=1);

// ─── Load .env ────────────────────────────────────────────────────────────────
// Priority: backend/.env (production/Hostinger) → project-root .env (XAMPP dev)
$envCandidates = [
    __DIR__ . '/../.env',      // public_html/backend/.env  — Hostinger
    __DIR__ . '/../../.env',   // project-root/.env         — XAMPP dev
];
foreach ($envCandidates as $envFile) {
    if (!file_exists($envFile)) continue;
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = array_map('trim', explode('=', $line, 2));
        if (!empty($key) && !isset($_ENV[$key])) {
            putenv("$key=$val");
            $_ENV[$key] = $val;
        }
    }
    break; // use first file found
}

define('DB_HOST',    getenv('DB_HOST')     ?: '127.0.0.1');
define('DB_PORT',    (int)(getenv('DB_PORT') ?: 3306));
define('DB_NAME',    getenv('DB_NAME')     ?: 'time_manager');
define('DB_USER',    getenv('DB_USER')     ?: 'root');
define('DB_PASS',    getenv('DB_PASS')     ?: '');
define('DB_CHARSET', 'utf8mb4');

function getDB(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', DB_HOST, DB_PORT, DB_NAME, DB_CHARSET);
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Database unavailable: ' . $e->getMessage()]);
        exit;
    }

    return $pdo;
}
