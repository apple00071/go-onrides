import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function migrateUsers() {
  try {
    console.log('Starting admin_users migration...');
    const db = await getDB();
    
    // Check if admin_users table exists
    const adminUsersTable = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='admin_users'
    `);
    
    if (!adminUsersTable) {
      console.log('No admin_users table found, no migration needed');
      return { migrated: false, message: 'No admin_users table found' };
    }
    
    console.log('admin_users table found, checking for users to migrate');
    
    // Get all users from admin_users table
    const adminUsers = await db.all('SELECT * FROM admin_users');
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('No users found in admin_users table');
      return { migrated: false, message: 'No users found in admin_users table' };
    }
    
    console.log(`Found ${adminUsers.length} users to migrate`);
    
    // Migrate each user
    let migratedCount = 0;
    for (const adminUser of adminUsers) {
      // Check if user already exists in users table
      const existingUser = await db.get(
        'SELECT * FROM users WHERE username = ?', 
        [adminUser.username]
      );
      
      if (!existingUser) {
        // Insert into users table
        await db.run(
          `INSERT INTO users (
            username, password, role, full_name, email, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            adminUser.username,
            adminUser.password,
            'admin',
            adminUser.username, // Use username as full_name if not available
            `${adminUser.username}@go-onriders.com`, // Default email
            'active',
            adminUser.createdAt || new Date().toISOString()
          ]
        );
        migratedCount++;
      }
    }
    
    console.log(`Successfully migrated ${migratedCount} users`);
    
    return { 
      migrated: true, 
      count: migratedCount,
      message: `Successfully migrated ${migratedCount} users from admin_users to users table`
    };
  } catch (error) {
    console.error('Migration error:', error);
    return { 
      migrated: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Migration failed'
    };
  }
} 