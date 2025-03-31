import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    console.log('Fixing /api/auth/me endpoint...');
    const db = await getDB();
    
    // Check the auth-me route file
    const meRoute = `src/app/api/auth/me/route.ts`;
    const fs = require('fs');
    const path = require('path');
    
    if (fs.existsSync(path.resolve(process.cwd(), meRoute))) {
      console.log('Found auth/me route file');
      
      // Read the file content
      const content = fs.readFileSync(path.resolve(process.cwd(), meRoute), 'utf8');
      
      // Check if it's using the wrong column name
      if (content.includes('last_login')) {
        console.log('Found incorrect column name reference');
        
        // Replace the column name
        const updatedContent = content.replace(/last_login/g, 'last_login_at');
        
        // Write the updated content back
        fs.writeFileSync(path.resolve(process.cwd(), meRoute), updatedContent);
        console.log('Updated auth/me route file');
      } else {
        console.log('No incorrect column name references found');
      }
    } else {
      console.log('Could not find auth/me route file');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Fixed auth/me route'
    });
    
  } catch (error) {
    console.error('Error fixing auth/me route:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fix auth/me route', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 