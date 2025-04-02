const { createClient } = require('@supabase/supabase-js');

// Create a new Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sggrtzrmjkbrxnztzveu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZ3J0enJtamticnhuenR6dmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc4MTQyNjQsImV4cCI6MjAxMzM5MDI2NH0.lVToRTGO99ECuPKbY7XRF-vEjRlAH4bP5Zs0SuZw1GE';

// Initialize the client
const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumnsAndTestData() {
  try {
    console.log('Adding columns to bookings table...');
    
    // First verify table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('bookings')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.error('Error accessing bookings table:', tableError);
      return;
    }
    
    console.log('Bookings table exists and is accessible');

    // Add columns using raw SQL - we can't use the RPC method, so we'll try this approach
    // This won't work directly but shows our intent - in practice, run this SQL in the Supabase SQL Editor
    console.log('To add columns, run the following SQL in the Supabase SQL Editor:');
    console.log(`
      -- Add documents and signature columns to the bookings table if they don't exist
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS documents JSONB;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS signature TEXT;
    `);

    // Set test data on a booking
    const bookingId = 51; // Use one from your previous test
    console.log(`Setting test data on booking ${bookingId}...`);
    
    const testDocuments = { 
      dl_front: 'test-front-image-data',
      dl_back: 'test-back-image-data'
    };
    
    const testSignature = 'test-signature-data';
    
    // Try to update the booking with the test data
    const { data: updateResult, error: updateError } = await supabase
      .from('bookings')
      .update({
        documents: testDocuments,
        signature: testSignature
      })
      .eq('id', bookingId);
      
    if (updateError) {
      console.error('Error updating booking:', updateError);
      
      // Check if it's a column not found error
      if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        console.log('Column does not exist error - confirm you need to run the SQL commands above');
      }
    } else {
      console.log('Update successful!');
    }
    
    // Try to retrieve the booking to verify
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('id, documents, signature')
      .eq('id', bookingId)
      .single();
      
    if (getError) {
      console.error('Error retrieving booking:', getError);
    } else {
      console.log('Retrieved booking:', booking);
      console.log('Documents present:', !!booking.documents);
      console.log('Signature present:', !!booking.signature);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addColumnsAndTestData(); 