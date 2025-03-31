<?php
// Database configuration
$db_path = __DIR__ . '/rental_records.db';

// JWT configuration
$jwt_secret = 'your-secret-key';

// Initialize SQLite database
try {
    $db = new SQLite3($db_path);
    
    // Create rentals table
    $db->exec("
        CREATE TABLE IF NOT EXISTS rentals (
            rentalId TEXT PRIMARY KEY,
            firstName TEXT,
            lastName TEXT,
            email TEXT,
            phone TEXT,
            fatherPhone TEXT,
            motherPhone TEXT,
            emergencyContact1 TEXT,
            emergencyContact2 TEXT,
            address TEXT,
            startDate TEXT,
            endDate TEXT,
            documentPath TEXT,
            signaturePath TEXT,
            customerPhotoPath TEXT,
            status TEXT DEFAULT 'active',
            returnDate TEXT,
            remarks TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // Create admin users table
    $db->exec("
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // Check if admin user exists, if not create one
    $stmt = $db->prepare("SELECT COUNT(*) FROM admin_users WHERE username = ?");
    $stmt->execute(['admin']);
    $count = $stmt->fetchColumn();

    if ($count == 0) {
        // Create admin user with hashed password using 12 rounds for better security
        $hashedPassword = password_hash('Goonriders123!', PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $db->prepare("INSERT INTO admin_users (username, password, createdAt) VALUES (?, ?, datetime('now'))");
        $stmt->execute(['admin', $hashedPassword]);
    }
} catch (Exception $e) {
    error_log('Database initialization error: ' . $e->getMessage());
    die('Database initialization failed');
} 