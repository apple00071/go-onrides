import { connectMongo } from './mongodb';
import User from '@/models/User';
import Customer from '@/models/Customer';
import Vehicle from '@/models/Vehicle';
import Booking from '@/models/Booking';
import mongoose from 'mongoose';

let isConnected = false;

const models = {
  User,
  Customer,
  Vehicle,
  Booking
};

export async function getDB() {
  try {
    if (!isConnected) {
      console.log('Initializing database connection...');
      await connectMongo();
      isConnected = true;
      console.log('Database connection initialized');
    }
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    return { models, db };
  } catch (error: any) {
    console.error('Error in getDB:', error);
    throw error;
  }
}

export async function executeTransaction<T>(
  callback: (db: { models: typeof models, db: mongoose.Connection['db'] }) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  
  try {
    let result: T;
    const { db } = await getDB();
    
    await session.withTransaction(async () => {
      result = await callback({ models, db });
    });
    return result!;
  } catch (error) {
    console.error('Transaction error:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function runQuery<T>(
  collection: string,
  operation: 'find' | 'findOne' | 'insertOne' | 'insertMany' | 'updateOne' | 'updateMany' | 'deleteOne' | 'deleteMany',
  query: any = {},
  options: any = {}
): Promise<T> {
  try {
    const { db } = await getDB();
    const coll = db.collection(collection);
    
    // @ts-ignore - MongoDB operations are properly typed at runtime
    const result = await coll[operation](query, options);
    return result as T;
  } catch (error) {
    console.error(`MongoDB query error (${collection}.${operation}):`, error);
    throw error;
  }
} 