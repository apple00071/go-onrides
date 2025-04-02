const { createClient } = require('@supabase/supabase-js');

// Create a new Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sggrtzrmjkbrxnztzveu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZ3J0enJtamticnhuenR6dmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc4MTQyNjQsImV4cCI6MjAxMzM5MDI2NH0.lVToRTGO99ECuPKbY7XRF-vEjRlAH4bP5Zs0SuZw1GE';

// Initialize the client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  try {
    console.log('Checking bookings table columns...');
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_string: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name IN ('documents', 'signature')
        ORDER BY column_name;
      `
    });
    
    console.log('Column check result:', data);
    if (error) console.error('Error:', error);
    
    // Now let's check a specific booking to see if documents and signature are present
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, documents, signature')
      .eq('id', 45)  // Use the ID from our last test
      .single();
      
    console.log('Booking check result:', booking);
    if (bookingError) console.error('Booking error:', bookingError);
    
    // Let's try to update documents and signature directly
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        documents: { test: 'data' },
        signature: 'test-signature'
      })
      .eq('id', 45);
      
    console.log('Update error:', updateError);
    
    // Check the booking again after the update
    const { data: updatedBooking, error: updatedError } = await supabase
      .from('bookings')
      .select('id, documents, signature')
      .eq('id', 45)
      .single();
      
    console.log('Updated booking check:', updatedBooking);
    if (updatedError) console.error('Updated booking error:', updatedError);
  } catch (e) {
    console.error('Error:', e);
  }
}

checkColumns(); 