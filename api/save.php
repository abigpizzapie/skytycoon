<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$saveDir = __DIR__ . '/saves';
if (!is_dir($saveDir)) {
    mkdir($saveDir, 0755, true);
}

// Simple token-based auth: require a player ID
$playerId = $_GET['player'] ?? $_POST['player'] ?? null;
if (!$playerId || !preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $playerId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid player ID']);
    exit;
}

$saveFile = $saveDir . '/' . $playerId . '.json';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (file_exists($saveFile)) {
            echo file_get_contents($saveFile);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'No save found']);
        }
        break;

    case 'POST':
        $data = file_get_contents('php://input');
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'No data']);
            exit;
        }
        // Validate it's valid JSON
        if (json_decode($data) === null) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            exit;
        }
        file_put_contents($saveFile, $data, LOCK_EX);
        echo json_encode(['ok' => true]);
        break;

    case 'DELETE':
        if (file_exists($saveFile)) {
            unlink($saveFile);
        }
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
