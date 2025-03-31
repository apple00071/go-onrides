import { NextResponse } from 'next/server';
import { getDB } from '@/lib/mongodb-handler';

export async function GET() {
  try {
    console.log('Starting MongoDB connection test...');
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    
    // Get database connection and models
    console.log('Attempting to get database connection...');
    const { db, models } = await getDB();
    console.log('Successfully got database connection');
    
    // Test MongoDB native driver connection
    console.log('Testing MongoDB native driver connection...');
    const collections = await db.collections();
    console.log('Available collections:', collections.map(c => c.collectionName));
    
    // Test Mongoose models
    console.log('Testing Mongoose models...');
    const userCount = await models.User.countDocuments();
    console.log('User count:', userCount);
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      collections: collections.map(c => c.collectionName),
      stats: {
        users: userCount
      }
    });
  } catch (error: any) {
    console.error('MongoDB test error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.syscall) {
      console.error('Error syscall:', error.syscall);
    }
    
    if (error.hostname) {
      console.error('Error hostname:', error.hostname);
    }
    
    return NextResponse.json({
      success: false,
      message: 'MongoDB connection failed',
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        syscall: error.syscall,
        hostname: error.hostname
      }
    }, { status: 500 });
  }
} 