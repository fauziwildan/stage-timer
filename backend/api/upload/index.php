<?php
declare(strict_types=1);

require_once __DIR__ . '/../../middleware/cors.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error']);
    exit;
}

// Ensure the directory exists
$uploadDir = __DIR__ . '/../../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$file = $_FILES['file'];
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$fileName = time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
$targetPath = $uploadDir . $fileName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    // Return relative path from backend root, frontend will prepend backend URL
    echo json_encode(['path' => 'uploads/' . $fileName]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file']);
}
