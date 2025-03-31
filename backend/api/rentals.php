<?php
header('Content-Type: application/json');

// Check if the origin is allowed
$allowedOrigins = ['https://admin.go-onriders.com', 'https://worker.go-onriders.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config.php';
require_once 'auth.php';

// Verify JWT token
$user = verifyToken();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $result = $db->query("SELECT * FROM rentals ORDER BY createdAt DESC");
        $rentals = [];
        
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $rentals[] = $row;
        }
        
        echo json_encode($rentals);
    } catch (Exception $e) {
        error_log('Error fetching rentals: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch rentals']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $rentalId = basename($_SERVER['PATH_INFO']);
    $data = json_decode(file_get_contents('php://input'), true);
    $remarks = $data['remarks'] ?? '';

    try {
        $stmt = $db->prepare("
            UPDATE rentals 
            SET status = :status, 
                returnDate = :returnDate, 
                remarks = :remarks 
            WHERE rentalId = :rentalId
        ");

        $stmt->bindValue(':status', 'returned');
        $stmt->bindValue(':returnDate', date('Y-m-d H:i:s'));
        $stmt->bindValue(':remarks', $remarks);
        $stmt->bindValue(':rentalId', $rentalId);
        
        $result = $stmt->execute();

        if ($result) {
            echo json_encode(['message' => 'Rental updated successfully']);
        } else {
            throw new Exception('Failed to update rental');
        }
    } catch (Exception $e) {
        error_log('Error updating rental: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update rental']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
} 