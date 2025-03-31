<?php
require_once 'vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

function verifyToken() {
    global $jwt_secret;
    
    // Get token from cookie
    $token = $_COOKIE['adminToken'] ?? null;
    
    if (!$token) {
        return null;
    }
    
    try {
        $decoded = JWT::decode($token, new Key($jwt_secret, 'HS256'));
        return [
            'id' => $decoded->id,
            'username' => $decoded->username
        ];
    } catch (Exception $e) {
        error_log('Token verification error: ' . $e->getMessage());
        return null;
    }
} 